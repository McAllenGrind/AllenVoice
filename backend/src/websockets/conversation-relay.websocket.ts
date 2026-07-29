import type {
    IncomingMessage,
    Server,
} from "node:http";

import twilio from "twilio";

import {
    WebSocket,
    WebSocketServer,
} from "ws";

import { aiService } from "../services/ai.service.js";
import { voiceCallService } from "../services/voice-call.service.js";

interface SetupMessage {
    type: "setup";
    sessionId: string;
    callSid: string;
    from: string;
    to: string;

    customParameters?: {
        companyId?: string;
    };
}

interface PromptMessage {
    type: "prompt";
    voicePrompt: string;
    lang: string;
    last: boolean;
}

interface InterruptMessage {
    type: "interrupt";
    utteranceUntilInterrupt?: string;
    durationUntilInterruptMs?: number;
}

interface RelayErrorMessage {
    type: "error";
    description?: string;
}

type ConversationRelayMessage =
    | SetupMessage
    | PromptMessage
    | InterruptMessage
    | RelayErrorMessage
    | {
        type: string;
        [key: string]: unknown;
    };

function getRelayDomain(): string {
    const rawDomain =
        process.env.CONVERSATION_RELAY_DOMAIN?.trim();

    if (!rawDomain) {
        throw new Error(
            "CONVERSATION_RELAY_DOMAIN est manquant.",
        );
    }

    return rawDomain
        .replace(/^https?:\/\//, "")
        .replace(/^wss?:\/\//, "")
        .replace(/\/+$/, "");
}

async function saveHistorySafely(
    operation: () => Promise<unknown>,
    label: string,
): Promise<void> {
    try {
        await operation();
    } catch (error) {
        console.error(
            `[ConversationRelay] Historique non enregistré (${label}) :`,
            error,
        );
    }
}

function isValidTwilioUpgrade(
    request: IncomingMessage,
): boolean {
    const authToken =
        process.env.TWILIO_AUTH_TOKEN;

    const signatureHeader =
        request.headers[
        "x-twilio-signature"
        ];

    const signature =
        Array.isArray(signatureHeader)
            ? signatureHeader[0]
            : signatureHeader;

    if (
        !authToken ||
        !signature
    ) {
        return false;
    }

    const domain =
        getRelayDomain();

    const requestPath =
        request.url ??
        "/voice/relay/ws";

    const externalUrl =
        `wss://${domain}${requestPath}`;

    return twilio.validateRequest(
        authToken,
        signature,
        externalUrl,
        {},
    );
}

function sendText(
    socket: WebSocket,
    text: string,
): void {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return;
    }

    socket.send(
        JSON.stringify({
            type: "text",
            token: text,
            last: true,
            interruptible: true,
            preemptible: true,
        }),
    );
}

interface ConversationTurn {
    role: "CUSTOMER" | "AGENT";
    text: string;
}

type RelayAIProvider =
    | "OPENAI"
    | "ANTHROPIC";

function getRelayAIProvider():
    RelayAIProvider {
    return process.env.VOICE_AI_PROVIDER
        ?.trim()
        .toUpperCase() === "OPENAI"
        ? "OPENAI"
        : "ANTHROPIC";
}

function getFallbackProvider(
    primaryProvider: RelayAIProvider,
): RelayAIProvider {
    return primaryProvider === "ANTHROPIC"
        ? "OPENAI"
        : "ANTHROPIC";
}

function getErrorStatus(
    error: unknown,
): number | null {
    if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error)
    ) {
        return null;
    }

    const status =
        (error as {
            status?: unknown;
        }).status;

    return typeof status === "number"
        ? status
        : null;
}

function isTemporaryAIError(
    error: unknown,
): boolean {
    const status =
        getErrorStatus(error);

    return (
        status === 408 ||
        status === 409 ||
        status === 429 ||
        (
            status !== null &&
            status >= 500
        )
    );
}

async function askWithVoiceFallback(
    companyId: string,
    question: string,
) {
    const primaryProvider =
        getRelayAIProvider();

    try {
        return await aiService.ask(
            companyId,
            {
                question,
                provider: primaryProvider,
            },
            {
                recordEvaluation: false,
            },
        );
    } catch (error) {
        if (!isTemporaryAIError(error)) {
            throw error;
        }

        const fallbackProvider =
            getFallbackProvider(
                primaryProvider,
            );

        console.warn(
            `[ConversationRelay] ${primaryProvider} temporairement indisponible ` +
            `(${getErrorStatus(error)}). Bascule vers ${fallbackProvider}.`,
        );

        return aiService.ask(
            companyId,
            {
                question,
                provider: fallbackProvider,
            },
            {
                recordEvaluation: false,
            },
        );
    }
}

function buildConversationQuestion(
    turns: ConversationTurn[],
): string {
    const recentTurns =
        turns.slice(-8);

    const transcript =
        recentTurns
            .map((turn) => {
                const speaker =
                    turn.role === "CUSTOMER"
                        ? "Client"
                        : "AllenVoice";

                return `${speaker}: ${turn.text}`;
            })
            .join("\n");

    return [
        "Voici la conversation téléphonique en cours :",
        transcript,
        "",
        "Réponds uniquement au dernier message du client.",
        "Utilise les messages précédents seulement pour comprendre le contexte.",
        "Ne répète pas une information déjà donnée, sauf si le client la redemande.",
        "Réponds naturellement et brièvement, comme pendant un appel téléphonique.",
    ].join("\n");
}

export function registerConversationRelayWebSocket(
    server: Server,
): void {
    const webSocketServer =
        new WebSocketServer({
            noServer: true,
        });

    server.on(
        "upgrade",
        (
            request,
            socket,
            head,
        ) => {
            const requestUrl =
                new URL(
                    request.url ?? "/",
                    "http://localhost",
                );

            if (
                requestUrl.pathname !==
                "/voice/relay/ws"
            ) {
                socket.destroy();
                return;
            }

            if (
                !isValidTwilioUpgrade(
                    request,
                )
            ) {
                console.error(
                    "[ConversationRelay] Signature Twilio invalide.",
                );

                socket.write(
                    "HTTP/1.1 403 Forbidden\r\n\r\n",
                );

                socket.destroy();
                return;
            }

            webSocketServer.handleUpgrade(
                request,
                socket,
                head,
                (webSocket) => {
                    webSocketServer.emit(
                        "connection",
                        webSocket,
                        request,
                    );
                },
            );
        },
    );

    webSocketServer.on(
        "connection",
        (socket) => {
            console.log(
                "[ConversationRelay] WebSocket connecté.",
            );

            let companyId: string | null =
                null;

            let callSid: string | null =
                null;

            const conversation:
                ConversationTurn[] = [];

            let generationNumber = 0;

            socket.on(
                "message",
                async (rawData) => {
                    try {
                        const message = JSON.parse(
                            rawData.toString(),
                        ) as ConversationRelayMessage;

                        if (message.type === "setup") {
                            const setup =
                                message as SetupMessage;

                            companyId =
                                setup.customParameters
                                    ?.companyId
                                    ?.trim() ?? null;

                            callSid =
                                setup.callSid?.trim() ?? null;

                            if (!companyId || !callSid) {
                                console.error(
                                    "[ConversationRelay] Session incomplète.",
                                    {
                                        companyId,
                                        callSid,
                                    },
                                );

                                socket.close(
                                    1008,
                                    "Session AllenVoice invalide.",
                                );

                                return;
                            }

                            console.log(
                                "[ConversationRelay] Session créée",
                                {
                                    callSid,
                                    companyId,
                                    from: setup.from,
                                    to: setup.to,
                                },
                            );

                            return;
                        }

                        if (message.type === "prompt") {
                            const prompt =
                                message as PromptMessage;

                            console.log(
                                "[ConversationRelay] Client :",
                                prompt.voicePrompt,
                                "| final :",
                                prompt.last,
                            );

                            if (!prompt.last) {
                                return;
                            }

                            const customerText =
                                prompt.voicePrompt.trim();

                            if (!customerText) {
                                return;
                            }

                            if (!callSid) {
                                console.error(
                                    "[ConversationRelay] CallSid manquant.",
                                );

                                return;
                            }

                            const activeCallSid = callSid;

                            await saveHistorySafely(
                                () =>
                                    voiceCallService.recordCustomerMessage(
                                        activeCallSid,
                                        customerText,
                                    ),
                                "message client",
                            );

                            if (!companyId) {
                                console.error(
                                    "[ConversationRelay] companyId manquant.",
                                );

                                sendText(
                                    socket,
                                    "Une erreur empêche AllenVoice de répondre pour le moment.",
                                );

                                return;
                            }

                            const currentGeneration =
                                ++generationNumber;

                            const conversationSnapshot:
                                ConversationTurn[] = [
                                    ...conversation,
                                    {
                                        role: "CUSTOMER",
                                        text: customerText,
                                    },
                                ];

                            const question =
                                buildConversationQuestion(
                                    conversationSnapshot,
                                );

                            try {
                                const result =
                                    await askWithVoiceFallback(
                                        companyId,
                                        question,
                                    );

                                if (
                                    currentGeneration !==
                                    generationNumber
                                ) {
                                    console.log(
                                        "[ConversationRelay] Réponse IA devenue obsolète.",
                                    );

                                    return;
                                }

                                conversation.push(
                                    {
                                        role: "CUSTOMER",
                                        text: customerText,
                                    },
                                    {
                                        role: "AGENT",
                                        text: result.answer,
                                    },
                                );

                                await saveHistorySafely(
                                    () =>
                                        voiceCallService.recordAgentMessage(
                                            activeCallSid,
                                            result,
                                        ),
                                    "réponse AllenVoice",
                                );

                                console.log(
                                    "[ConversationRelay] AllenVoice :",
                                    result.answer,
                                );

                                sendText(
                                    socket,
                                    result.answer,
                                );
                            } catch (error) {
                                console.error(
                                    "[ConversationRelay] Erreur IA :",
                                    error,
                                );

                                sendText(
                                    socket,
                                    "Je suis désolé, je ne peux pas répondre pour le moment.",
                                );
                            }

                            return;
                        }

                        if (message.type === "interrupt") {
                            generationNumber += 1;

                            console.log(
                                "[ConversationRelay] Le client a interrompu AllenVoice.",
                            );

                            return;
                        }

                        if (message.type === "error") {
                            const relayError =
                                message as RelayErrorMessage;

                            console.error(
                                "[ConversationRelay] Erreur Twilio :",
                                relayError.description,
                            );

                            return;
                        }
                    } catch (error) {
                        console.error(
                            "[ConversationRelay] Message WebSocket invalide :",
                            error,
                        );
                    }
                },
            );

            socket.on(
                "close",
                () => {
                    console.log(
                        "[ConversationRelay] WebSocket fermé.",
                    );
                },
            );

            socket.on(
                "error",
                (error) => {
                    console.error(
                        "[ConversationRelay] Erreur WebSocket :",
                        error,
                    );
                },
            );
        },
    );
}