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
import type {
    AIProviderResult,
} from "../models/ai.types.js";

import {
    buildResponseLanguageInstruction,
    createInitialCallLanguageState,
    evaluateCallLanguage,
    type CallLanguage,
} from "../services/call-language.service.js";

interface SetupMessage {
    type: "setup";
    sessionId: string;
    callSid: string;
    from: string;
    to: string;

    customParameters?: {
        companyId?: string;

        transcriptionProvider?:
        string;
    };
}

interface PromptMessage {
    type: "prompt";
    voicePrompt: string;
    lang?: string;
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

function sendTextToken(
    socket: WebSocket,
    token: string,
    last: boolean,
): void {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return;
    }

    if (!token) {
        return;
    }

    socket.send(
        JSON.stringify({
            type: "text",
            token,
            last,
            interruptible: true,
            preemptible: true,
        }),
    );
}

/*
 * Compatibilité avec les réponses non streamées
 * et les messages d’erreur.
 */
function sendText(
    socket: WebSocket,
    text: string,
): void {
    sendTextToken(
        socket,
        text,
        true,
    );
}

type RelayTranscriptionProvider =
    | "Deepgram"
    | "Google";

function sendLanguageSelection(
    socket: WebSocket,
    language: CallLanguage,
    transcriptionProvider:
        RelayTranscriptionProvider,
): void {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return;
    }

    const message: {
        type: "language";
        ttsLanguage: CallLanguage;
        transcriptionLanguage?:
        CallLanguage;
    } = {
        type:
            "language",

        ttsLanguage:
            language,
    };

    /*
     * Deepgram reste en mode multi afin
     * de continuer à détecter les deux langues.
     *
     * Google ne possède pas ce mode dans
     * cette configuration : on change donc
     * aussi sa langue de transcription.
     */
    if (
        transcriptionProvider ===
        "Google"
    ) {
        message.transcriptionLanguage =
            language;
    }

    socket.send(
        JSON.stringify(
            message,
        ),
    );
}

function endRelaySession(
    socket: WebSocket,
    reason:
        | "conversation-completed"
        | "silence-timeout" =
        "conversation-completed",
): void {
    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {
        return;
    }

    console.log(
        "[ConversationRelay] Fin automatique de la conversation.",
    );

    socket.send(
        JSON.stringify({
            type: "end",

            handoffData:
                JSON.stringify({
                    reason,
                }),
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

async function streamWithVoiceFallback(
    companyId: string,
    question: string,
    knowledgeQuery: string,
    writer: RelayTextWriter,
    signal: AbortSignal,
): Promise<AIProviderResult> {
    const primaryProvider =
        getRelayAIProvider();

    const run = (
        provider: RelayAIProvider,
    ) => {
        signal.throwIfAborted();

        return aiService.stream(
            companyId,
            {
                question,
                knowledgeQuery,
                provider,
            },
            {
                recordEvaluation: false,
                signal,

                onTextDelta: (
                    delta,
                ) => {
                    writer.push(delta);
                },
            },
        );
    };

    try {
        const result =
            await run(
                primaryProvider,
            );

        writer.finish();

        return result;
    } catch (error) {
        if (signal.aborted) {
            throw new ObsoleteGenerationError();
        }

        if (
            error instanceof
            ObsoleteGenerationError
        ) {
            throw error;
        }

        /*
         * On ne change de fournisseur que
         * si le client n’a encore rien entendu.
         */
        if (
            !writer.hasSentToken &&
            isTemporaryAIError(error)
        ) {
            const fallbackProvider =
                getFallbackProvider(
                    primaryProvider,
                );

            console.warn(
                `[ConversationRelay] ${primaryProvider} indisponible. ` +
                `Bascule vers ${fallbackProvider}.`,
            );

            writer.reset();

            const result =
                await run(
                    fallbackProvider,
                );

            writer.finish();

            return result;
        }

        throw error;
    }
}

class ObsoleteGenerationError
    extends Error {
    constructor() {
        super(
            "La génération IA est devenue obsolète.",
        );

        this.name =
            "ObsoleteGenerationError";
    }
}

class RelayTextWriter {
    private pendingToken:
        | string
        | null = null;

    public hasSentToken = false;

    constructor(
        private readonly socket:
            WebSocket,

        private readonly isCurrent:
            () => boolean,
    ) { }

    push(token: string): void {
        if (!this.isCurrent()) {
            throw new ObsoleteGenerationError();
        }

        if (!token) {
            return;
        }

        /*
         * On envoie l’ancien morceau,
         * puis on garde le nouveau en attente.
         */
        if (
            this.pendingToken !== null
        ) {
            sendTextToken(
                this.socket,
                this.pendingToken,
                false,
            );

            this.hasSentToken = true;
        }

        this.pendingToken = token;
    }

    finish(): void {
        if (!this.isCurrent()) {
            throw new ObsoleteGenerationError();
        }

        if (
            this.pendingToken === null
        ) {
            return;
        }

        sendTextToken(
            this.socket,
            this.pendingToken,
            true,
        );

        this.hasSentToken = true;
        this.pendingToken = null;
    }

    reset(): void {
        this.pendingToken = null;
        this.hasSentToken = false;
    }

    finishWithError(): void {
        if (!this.isCurrent()) {
            return;
        }

        if (
            this.pendingToken !== null
        ) {
            sendTextToken(
                this.socket,
                this.pendingToken,
                false,
            );

            this.pendingToken = null;
            this.hasSentToken = true;
        }

        sendTextToken(
            this.socket,
            " Je suis désolé, la réponse a été interrompue.",
            true,
        );

        this.hasSentToken = true;
    }
}

function buildContextualKnowledgeQuery(
    currentText: string,
    turns: ConversationTurn[],
): string {
    const normalized =
        normalizeText(
            currentText,
        );

    const wordCount =
        normalized
            .split(" ")
            .filter(Boolean)
            .length;

    const followUpPatterns = [
        "cest quoi deja",
        "c'est quoi deja",
        "je nai pas compris",
        "je n'ai pas compris",
        "vous avez dit combien",
        "combien deja",
        "vous pouvez repeter",
        "vous pouvez répéter",
        "repetez",
        "répétez",
        "repete",
        "répète",
        "quel code",
        "mais cest quoi",
        "mais c'est quoi",
        "500 combien",
        "et pour celui",
        "et pour celle",
    ];

    const looksLikeFollowUp =
        wordCount <= 10 &&
        followUpPatterns.some(
            (pattern) =>
                normalized.includes(
                    normalizeText(
                        pattern,
                    ),
                ),
        );

    if (!looksLikeFollowUp) {
        return currentText;
    }

    const previousCustomerTurn =
        [...turns]
            .reverse()
            .find((turn) => {
                if (
                    turn.role !==
                    "CUSTOMER"
                ) {
                    return false;
                }

                const previousText =
                    normalizeText(
                        turn.text,
                    );

                const previousWordCount =
                    previousText
                        .split(" ")
                        .filter(Boolean)
                        .length;

                return (
                    previousWordCount >= 4 &&
                    previousText !==
                    normalized
                );
            });

    if (!previousCustomerTurn) {
        return currentText;
    }

    return [
        previousCustomerTurn.text,
        `Question de suivi : ${currentText}`,
    ].join("\n");
}

function buildConversationQuestion(
    turns: ConversationTurn[],
    customerWantsToEnd: boolean,
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

    const closingState =
        customerWantsToEnd
            ? [
                "Le client souhaite clairement terminer l’appel.",
                "Clôture naturellement la conversation.",
                "Termine obligatoirement par exactement une des formulations de clôture autorisées.",
            ].join(" ")
            : [
                "Le client n’a pas clairement demandé de terminer l’appel.",
                "Ne dis pas au revoir.",
                "N’utilise aucune des formulations de clôture autorisées.",
                "S’il remercie simplement, réponds brièvement sans clôturer l’appel.",
            ].join(" ");

    return [
        "Voici la conversation téléphonique en cours :",
        transcript,
        "",
        `ÉTAT DE FIN D’APPEL : ${closingState}`,
        "",
        "Réponds uniquement au dernier message du client.",
        "Utilise les messages précédents seulement pour comprendre le contexte.",
        "Ne répète pas une information déjà donnée, sauf si le client la redemande.",
        "Réponds naturellement et brièvement, comme pendant un appel téléphonique.",
        "",
        "STYLE DE CONVERSATION :",
        "Parle naturellement comme une vraie personne au téléphone.",
        "Ne termine pas systématiquement tes réponses par une question.",
        "Ne demande pas systématiquement au client s'il a d'autres questions.",
        "Évite les formulations répétitives comme « N'hésitez pas si vous avez d'autres questions ».",
        "Si tu ne peux pas effectuer une action demandée, explique-le simplement et brièvement, puis laisse naturellement le client réagir.",
        "Ne transforme pas chaque réponse en message de service client générique.",
        "Adapte ton ton au contexte de la conversation.",
        "",
        "ACTIONS NON DISPONIBLES :",
        "Si le client demande une action que tu ne peux pas réellement effectuer, ne prétends jamais l'avoir faite.",
        "Dis simplement et naturellement que tu ne peux pas effectuer cette action pour le moment.",
        "Tu peux donner une information utile ou expliquer ce qui est possible, mais ne termine pas automatiquement en demandant si le client a d'autres questions.",
        "",
        "RÈGLE IMPORTANTE POUR LA FIN D'APPEL :",
        "RÈGLE IMPORTANTE POUR LA FIN D'APPEL :",
        "Respecte obligatoirement l’état de fin d’appel indiqué plus haut.",
        "Si l’état indique que le client ne souhaite pas terminer, ne dis jamais au revoir et n’utilise aucune formulation officielle de clôture.",
        "Un simple « merci » ne signifie pas automatiquement que le client souhaite terminer.",
        "Si le client remercie sans terminer, une réponse courte comme « Avec plaisir. » suffit.",
        "Si l’état indique que le client souhaite clairement terminer, clôture naturellement l’appel.",
        "Lorsque tu clôtures réellement l’appel, termine obligatoirement ta réponse par EXACTEMENT l’une de ces formulations :",
        ...CALL_CLOSING_PHRASES.map(
            (phrase) => `- ${phrase}`,
        ),
        "N'utilise pas ces formulations pour clôturer tant que le client souhaite poursuivre la conversation.",
    ].join("\n");
}

const CALL_CLOSING_PHRASES = [
    "Avec plaisir. Bonne journée !",
    "Je vous en prie. Bonne journée !",
    "Merci de votre appel. Bonne journée !",
    "Au revoir et bonne journée !",
] as const;

const CALL_CLOSING_DELAY_MS = 10_000;

const SILENCE_CLOSING_DELAY_MS =
    2_500;

function getTotalSilenceTimeoutMs():
    number {
    const rawSeconds =
        process.env
            .VOICE_TOTAL_SILENCE_TIMEOUT_SECONDS
            ?.trim();

    const configuredSeconds =
        Number(rawSeconds);

    if (
        !rawSeconds ||
        !Number.isFinite(
            configuredSeconds,
        ) ||
        configuredSeconds < 10
    ) {
        return 30_000;
    }

    return Math.round(
        configuredSeconds * 1_000,
    );
}

function normalizeText(
    text: string,
): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /[!?.,;:]+/g,
            "",
        )
        .replace(/\s+/g, " ")
        .trim();
}

function isOfficialClosing(
    text: string,
): boolean {
    const normalizedAnswer =
        normalizeText(text);

    return CALL_CLOSING_PHRASES.some(
        (phrase) =>
            normalizedAnswer.endsWith(
                normalizeText(phrase),
            ),
    );
}

function customerIndicatesEnd(
    text: string,
): boolean {
    const normalized =
        normalizeText(text);

    const endPatterns = [
        "c'est bon",
        "cest bon",
        "je n'ai plus de questions",
        "je nai plus de questions",
        "plus de questions",
        "c'est tout",
        "cest tout",
        "ce sera tout",
        "non merci",
        "merci c'est tout",
        "merci cest tout",
        "merci c'est bon",
        "merci cest bon",
        "parfait merci",
        "parfait merci bien",
        "thats good",
        "that's good",
        "thats all",
        "that's all",
        "have a good day",
        "have a great day",
        "have a nice day",
        "goodbye",
        "bye",
        "thank you goodbye",
        "thanks goodbye",
        "no more questions",
        "d'accord merci",
        "daccord merci",
        "merci bien bonne journee",
        "merci beaucoup bonne journee",
        "bonne journee a vous",
        "je vais vous laisser",
        "c'est parfait merci",
        "cest parfait merci",
        "au revoir",
        "bonne journee",
        "bonne soiree",
    ];

    return endPatterns.some(
        (pattern) =>
            normalized.includes(
                normalizeText(pattern),
            ),
    );
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

            let activeGenerationController:
                | AbortController
                | null = null;

            let farewellTimer:
                | ReturnType<typeof setTimeout>
                | null = null;

            let silenceTimer:
                | ReturnType<typeof setTimeout>
                | null = null;

            let silenceClosingTimer:
                | ReturnType<typeof setTimeout>
                | null = null;

            let customerWantsToEnd = false;

            let languageState =
                createInitialCallLanguageState();

            let transcriptionProvider:
                RelayTranscriptionProvider =
                "Deepgram";

            const cancelFarewellTimer =
                (): void => {
                    if (farewellTimer === null) {
                        return;
                    }

                    clearTimeout(
                        farewellTimer,
                    );

                    farewellTimer = null;

                    console.log(
                        "[ConversationRelay] Fin automatique annulée : le client a repris la parole.",
                    );
                };

            const cancelSilenceTimers =
                (): void => {
                    if (
                        silenceTimer !== null
                    ) {
                        clearTimeout(
                            silenceTimer,
                        );

                        silenceTimer = null;
                    }

                    if (
                        silenceClosingTimer !==
                        null
                    ) {
                        clearTimeout(
                            silenceClosingTimer,
                        );

                        silenceClosingTimer =
                            null;
                    }
                };

            const scheduleSilenceTimeout =
                (): void => {
                    cancelSilenceTimers();

                    const timeoutMs =
                        getTotalSilenceTimeoutMs();

                    silenceTimer =
                        setTimeout(
                            () => {
                                silenceTimer = null;

                                /*
                                 * Par sécurité, toute génération
                                 * encore active devient obsolète.
                                 */
                                generationNumber += 1;

                                activeGenerationController
                                    ?.abort();

                                activeGenerationController =
                                    null;

                                cancelFarewellTimer();

                                console.log(
                                    "[ConversationRelay] Silence total détecté. Fermeture de l'appel.",
                                    {
                                        silenceSeconds:
                                            Math.round(
                                                timeoutMs /
                                                1_000,
                                            ),
                                    },
                                );

                                sendText(
                                    socket,
                                    "Je vais mettre fin à l'appel. Bonne journée !",
                                );

                                /*
                                 * On laisse quelques secondes
                                 * à Twilio pour prononcer le
                                 * message avant de raccrocher.
                                 */
                                silenceClosingTimer =
                                    setTimeout(
                                        () => {
                                            silenceClosingTimer =
                                                null;

                                            endRelaySession(
                                                socket,
                                                "silence-timeout",
                                            );
                                        },
                                        SILENCE_CLOSING_DELAY_MS,
                                    );
                            },
                            timeoutMs,
                        );
                };

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

                            transcriptionProvider =
                                setup.customParameters
                                    ?.transcriptionProvider ===
                                    "Google"
                                    ? "Google"
                                    : "Deepgram";

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

                            const restoredConversation =
                                await voiceCallService
                                    .getRecentConversation(
                                        callSid,
                                        8,
                                    );

                            conversation.splice(
                                0,
                                conversation.length,
                                ...restoredConversation,
                            );

                            if (
                                restoredConversation.length > 0
                            ) {
                                console.log(
                                    "[ConversationRelay] Contexte précédent restauré.",
                                    {
                                        callSid,
                                        restoredMessages:
                                            restoredConversation.length,
                                    },
                                );
                            }

                            console.log(
                                "[ConversationRelay] Session créée",
                                {
                                    callSid,
                                    companyId,
                                    from: setup.from,
                                    to: setup.to,

                                    transcriptionProvider,

                                    currentLanguage:
                                        languageState
                                            .currentLanguage,
                                },
                            );

                            scheduleSilenceTimeout();

                            return;
                        }

                        if (message.type === "prompt") {
                            const prompt =
                                message as PromptMessage;

                            cancelFarewellTimer();
                            cancelSilenceTimers();

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

                            const languageEvaluation =
                                evaluateCallLanguage({
                                    state:
                                        languageState,

                                    text:
                                        customerText,

                                    providerLanguage:
                                        transcriptionProvider ===
                                            "Deepgram"
                                            ? prompt.lang
                                            : undefined,
                                });

                            languageState =
                                languageEvaluation.nextState;

                            console.log(
                                "[ConversationRelay] Décision de langue",
                                {
                                    providerLanguage:
                                        prompt.lang,

                                    currentLanguage:
                                        languageState
                                            .currentLanguage,

                                    detectedLanguage:
                                        languageEvaluation
                                            .detectedLanguage,

                                    shouldSwitch:
                                        languageEvaluation
                                            .shouldSwitch,

                                    reason:
                                        languageEvaluation
                                            .reason,

                                    frenchScore:
                                        languageEvaluation
                                            .frenchScore,

                                    englishScore:
                                        languageEvaluation
                                            .englishScore,
                                },
                            );

                            if (
                                languageEvaluation
                                    .shouldSwitch
                            ) {
                                sendLanguageSelection(
                                    socket,
                                    languageState
                                        .currentLanguage,
                                    transcriptionProvider,
                                );

                                console.log(
                                    "[ConversationRelay] Langue active modifiée",
                                    {
                                        language:
                                            languageState
                                                .currentLanguage,
                                    },
                                );
                            }

                            customerWantsToEnd =
                                customerIndicatesEnd(
                                    customerText,
                                );

                            if (!customerText) {
                                scheduleSilenceTimeout();
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

                            /*
 * Une nouvelle demande rend toute génération
 * précédente obsolète, même si Twilio n’a pas
 * envoyé d’événement interrupt.
 */
                            activeGenerationController?.abort();

                            const currentGeneration =
                                ++generationNumber;

                            const generationController =
                                new AbortController();

                            activeGenerationController =
                                generationController;

                            const conversationSnapshot:
                                ConversationTurn[] = [
                                    ...conversation,
                                    {
                                        role: "CUSTOMER",
                                        text: customerText,
                                    },
                                ];

                            const question = [
                                buildConversationQuestion(
                                    conversationSnapshot,
                                    customerWantsToEnd,
                                ),

                                buildResponseLanguageInstruction(
                                    languageState
                                        .currentLanguage,
                                ),
                            ].join("\n\n");

                            const knowledgeQuery =
                                buildContextualKnowledgeQuery(
                                    customerText,
                                    conversation,
                                );

                            const writer =
                                new RelayTextWriter(
                                    socket,
                                    () =>
                                        currentGeneration ===
                                        generationNumber,
                                );

                            let result: AIProviderResult;

                            try {
                                result =
                                    await streamWithVoiceFallback(
                                        companyId,
                                        question,
                                        knowledgeQuery,
                                        writer,
                                        generationController.signal,
                                    );

                                if (
                                    currentGeneration !==
                                    generationNumber
                                ) {
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
                                const officialClosing =
                                    isOfficialClosing(
                                        result.answer,
                                    );

                                console.log(
                                    "[ConversationRelay] Analyse fin d'appel :",
                                    {
                                        customerWantsToEnd,
                                        officialClosing,
                                    },
                                );

                                if (customerWantsToEnd) {
                                    cancelSilenceTimers();
                                    cancelFarewellTimer();

                                    console.log(
                                        "[ConversationRelay] Clôture confirmée. Attente de 10 secondes.",
                                    );

                                    farewellTimer =
                                        setTimeout(
                                            () => {
                                                farewellTimer = null;

                                                endRelaySession(
                                                    socket,
                                                );
                                            },
                                            CALL_CLOSING_DELAY_MS,
                                        );
                                } else {
                                    /*
                                     * AllenVoice vient de terminer sa réponse.
                                     * On attend maintenant la prochaine parole
                                     * du client.
                                     */
                                    scheduleSilenceTimeout();
                                }

                            } catch (error) {
                                if (
                                    generationController.signal.aborted ||
                                    error instanceof
                                    ObsoleteGenerationError
                                ) {
                                    console.log(
                                        "[ConversationRelay] Génération annulée après interruption.",
                                    );

                                    return;
                                }

                                console.error(
                                    "[ConversationRelay] Erreur IA :",
                                    error,
                                );

                                if (writer.hasSentToken) {
                                    writer.finishWithError();
                                } else {
                                    sendText(
                                        socket,
                                        "Je suis désolé, je ne peux pas répondre pour le moment.",
                                    );
                                }

                                scheduleSilenceTimeout();

                                return;
                            } finally {
                                if (
                                    activeGenerationController ===
                                    generationController
                                ) {
                                    activeGenerationController = null;
                                }
                            }

                            return;
                        }

                        if (
                            message.type === "interrupt"
                        ) {
                            cancelFarewellTimer();
                            cancelSilenceTimers();

                            generationNumber += 1;

                            if (
                                activeGenerationController &&
                                !activeGenerationController
                                    .signal.aborted
                            ) {
                                activeGenerationController
                                    .abort();
                            }

                            activeGenerationController =
                                null;

                            console.log(
                                "[ConversationRelay] Le client a interrompu AllenVoice. Génération IA annulée.",
                            );

                            /*
                             * Le client vient d’interrompre l’agent.
                             * Il dispose maintenant de 30 secondes
                             * pour continuer à parler.
                             */
                            scheduleSilenceTimeout();

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
                    generationNumber += 1;

                    activeGenerationController
                        ?.abort();

                    activeGenerationController =
                        null;

                    cancelFarewellTimer();
                    cancelSilenceTimers();

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