import type {
    NextFunction,
    Request,
    Response,
} from "express";

import twilio from "twilio";

import {
    agentService,
} from "../services/agent.service.js";

import {
    voiceRoutingService,
} from "../services/voice-routing.service.js";

import {
    voiceCallService,
} from "../services/voice-call.service.js";

type RelayTranscriptionProvider =
    | "Deepgram"
    | "Google";

interface TwilioIncomingCallBody {
    CallSid?: string;
    From?: string;
    To?: string;
}

interface TwilioRelayActionBody
    extends TwilioIncomingCallBody {
    CallStatus?: string;
    SessionId?: string;
    SessionStatus?: string;
    SessionDuration?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    HandoffData?: string;
}

interface BuildRelayTwimlInput {
    companyId: string;
    welcomeMessage: string;
    transcriptionProvider:
    RelayTranscriptionProvider;
    fallbackUsed: boolean;
}

function getConversationRelayDomain():
    string {
    const rawDomain =
        process.env
            .CONVERSATION_RELAY_DOMAIN
            ?.trim();

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

function getPrimaryTranscriptionProvider():
    RelayTranscriptionProvider {
    return process.env
        .VOICE_STT_PRIMARY_PROVIDER
        ?.trim()
        .toUpperCase() === "GOOGLE"
        ? "Google"
        : "Deepgram";
}

function buildRelayActionUrl(
    provider:
        RelayTranscriptionProvider,
    fallbackUsed: boolean,
): string {
    const domain =
        getConversationRelayDomain();

    const actionUrl =
        new URL(
            `https://${domain}/voice/relay/action`,
        );

    actionUrl.searchParams.set(
        "provider",
        provider,
    );

    actionUrl.searchParams.set(
        "fallbackUsed",
        fallbackUsed
            ? "1"
            : "0",
    );

    return actionUrl.toString();
}

function buildRelayTwiml(
    input: BuildRelayTwimlInput,
): twilio.twiml.VoiceResponse {
    const domain =
        getConversationRelayDomain();

    const voiceId =
        process.env
            .CONVERSATION_RELAY_VOICE_ID
            ?.trim() ||
        "IPgYtHTNLjC7Bq7IPHrm";

    const twiml =
        new twilio.twiml
            .VoiceResponse();

    /*
     * Lorsque cette session se termine,
     * Twilio appellera cet endpoint.
     */
    const connect =
        twiml.connect({
            action:
                buildRelayActionUrl(
                    input
                        .transcriptionProvider,
                    input.fallbackUsed,
                ),

            method: "POST",
        });

    /*
     * Le modèle Google "telephony"
     * n’est pas utilisé avec Deepgram.
     * Twilio choisira automatiquement
     * le modèle Deepgram compatible.
     */
    const relay =
        input.transcriptionProvider ===
            "Google"
            ? connect.conversationRelay({
                url:
                    `wss://${domain}/voice/relay/ws`,

                welcomeGreeting:
                    input.welcomeMessage,

                language:
                    "fr-CA",

                transcriptionProvider:
                    "Google",

                speechModel:
                    "telephony",

                ttsProvider:
                    "ElevenLabs",

                voice:
                    voiceId,

                interruptible:
                    "speech",

                reportInputDuringAgentSpeech:
                    true,

                interruptSensitivity:
                    "medium",

                ignorebackchannel:
                    "true",
            })
            : connect.conversationRelay({
                url:
                    `wss://${domain}/voice/relay/ws`,

                welcomeGreeting:
                    input.welcomeMessage,

                language:
                    "fr-CA",

                transcriptionProvider:
                    "Deepgram",

                ttsProvider:
                    "ElevenLabs",

                voice:
                    voiceId,

                interruptible:
                    "speech",

                reportInputDuringAgentSpeech:
                    true,

                interruptSensitivity:
                    "medium",

                ignorebackchannel:
                    "true",
            });

    relay.parameter({
        name: "companyId",
        value: input.companyId,
    });

    relay.parameter({
        name: "sttProvider",
        value:
            input.transcriptionProvider,
    });

    relay.parameter({
        name: "sttFallbackUsed",
        value:
            input.fallbackUsed
                ? "true"
                : "false",
    });

    return twiml;
}

function sendTwiml(
    res: Response,
    twiml:
        twilio.twiml.VoiceResponse,
): void {
    res
        .status(200)
        .type("text/xml")
        .send(
            twiml.toString(),
        );
}

export async function handleRelayIncomingCall(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const body =
            req.body as
            TwilioIncomingCallBody;

        const callSid =
            body.CallSid?.trim() ?? "";

        const fromNumber =
            body.From?.trim() ||
            undefined;

        const toNumber =
            body.To?.trim() ?? "";

        if (!callSid) {
            throw new Error(
                "CallSid Twilio manquant.",
            );
        }

        if (!toNumber) {
            throw new Error(
                "Numéro appelé manquant.",
            );
        }

        const company =
            await voiceRoutingService
                .getCompanyByPhoneNumber(
                    toNumber,
                );

        const primaryAIProvider =
            process.env
                .VOICE_AI_PROVIDER
                ?.trim()
                .toUpperCase() ===
                "OPENAI"
                ? "OPENAI"
                : "ANTHROPIC";

        /*
         * Cette création ne se produit
         * qu’une seule fois, à l’arrivée
         * initiale de l’appel.
         */
        await voiceCallService.start({
            companyId:
                company.id,

            twilioCallSid:
                callSid,

            fromNumber,
            toNumber,

            provider:
                primaryAIProvider,
        });

        const agentConfiguration =
            await agentService
                .getConfiguration(
                    company.id,
                );

        const transcriptionProvider =
            getPrimaryTranscriptionProvider();

        console.log(
            "[ConversationRelay] Démarrage STT",
            {
                callSid,
                transcriptionProvider,
            },
        );

        const twiml =
            buildRelayTwiml({
                companyId:
                    company.id,

                welcomeMessage:
                    agentConfiguration
                        .welcomeMessage,

                transcriptionProvider,

                fallbackUsed:
                    false,
            });

        sendTwiml(
            res,
            twiml,
        );
    } catch (error) {
        next(error);
    }
}

export async function handleRelayAction(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const body =
            req.body as
            TwilioRelayActionBody;

        const callSid =
            body.CallSid?.trim() ?? "";

        const toNumber =
            body.To?.trim() ?? "";

        const callStatus =
            body.CallStatus
                ?.trim()
                .toLowerCase() ?? "";

        const sessionStatus =
            body.SessionStatus
                ?.trim()
                .toLowerCase() ?? "";

        const errorCode =
            body.ErrorCode
                ?.trim() || undefined;

        const errorMessage =
            body.ErrorMessage
                ?.trim() || undefined;

        const providerQuery =
            typeof req.query.provider ===
                "string"
                ? req.query.provider
                    .trim()
                    .toLowerCase()
                : "";

        const previousProvider:
            RelayTranscriptionProvider =
            providerQuery === "google"
                ? "Google"
                : "Deepgram";

        const fallbackUsed =
            req.query.fallbackUsed ===
            "1";

        console.log(
            "[ConversationRelay] Fin de session Relay",
            {
                callSid,
                callStatus,
                sessionStatus,
                previousProvider,
                fallbackUsed,
                errorCode,
                errorMessage,
            },
        );

        /*
         * Le même appel est encore actif,
         * Deepgram vient d’échouer et
         * aucun fallback n’a encore été fait.
         */
        const relayHasError =
            sessionStatus === "failed" ||
            Boolean(errorCode) ||
            Boolean(errorMessage);

        const shouldFallbackToGoogle =
            callStatus ===
            "in-progress" &&
            previousProvider ===
            "Deepgram" &&
            !fallbackUsed &&
            relayHasError;

        console.log(
            "[ConversationRelay] Décision fallback STT",
            {
                relayHasError,
                shouldFallbackToGoogle,
                sessionStatus,
                callStatus,
                previousProvider,
                fallbackUsed,
                errorCode,
            },
        );

        if (
            shouldFallbackToGoogle
        ) {
            if (!toNumber) {
                throw new Error(
                    "Numéro appelé manquant pendant le fallback STT.",
                );
            }

            const company =
                await voiceRoutingService
                    .getCompanyByPhoneNumber(
                        toNumber,
                    );

            const agentConfiguration =
                await agentService
                    .getConfiguration(
                        company.id,
                    );

            console.warn(
                "[ConversationRelay] Deepgram indisponible. Bascule vers Google.",
                {
                    callSid,
                    errorCode,
                    errorMessage,
                },
            );

            /*
             * On ne rappelle pas
             * voiceCallService.start().
             * Il s’agit toujours du même
             * appel Twilio et du même CallSid.
             */
            const twiml =
                buildRelayTwiml({
                    companyId:
                        company.id,

                    welcomeMessage:
                        "Je vous écoute.",

                    transcriptionProvider:
                        "Google",

                    fallbackUsed:
                        true,
                });

            sendTwiml(
                res,
                twiml,
            );

            return;
        }

        /*
         * Si Google échoue après le fallback,
         * on ne crée pas une boucle infinie.
         */
        const twiml =
            new twilio.twiml
                .VoiceResponse();

        if (
            sessionStatus ===
            "failed" &&
            callStatus ===
            "in-progress"
        ) {
            console.error(
                "[ConversationRelay] Échec définitif de la transcription.",
                {
                    callSid,
                    previousProvider,
                    errorCode,
                    errorMessage,
                },
            );

            twiml.say(
                {
                    language:
                        "fr-CA",
                },
                "Je suis désolé, un problème technique m’empêche de poursuivre l’appel. Veuillez réessayer dans quelques instants.",
            );
        }

        /*
         * Pour une fin normale, Twilio
         * terminera simplement l’appel.
         */
        twiml.hangup();

        sendTwiml(
            res,
            twiml,
        );
    } catch (error) {
        next(error);
    }
}