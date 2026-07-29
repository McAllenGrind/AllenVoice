import type {
    NextFunction,
    Request,
    Response,
} from "express";

import twilio from "twilio";

import { agentService } from "../services/agent.service.js";
import { voiceRoutingService } from "../services/voice-routing.service.js";
import { voiceCallService } from "../services/voice-call.service.js";

interface TwilioIncomingCallBody {
    CallSid?: string;
    From?: string;
    To?: string;
}

function getConversationRelayDomain(): string {
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

export async function handleRelayIncomingCall(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const body =
            req.body as TwilioIncomingCallBody;

        const callSid =
            body.CallSid?.trim() ?? "";

        const fromNumber =
            body.From?.trim() || undefined;

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
            await voiceRoutingService.getCompanyByPhoneNumber(
                toNumber,
            );
        const primaryProvider =
            process.env.VOICE_AI_PROVIDER
                ?.trim()
                .toUpperCase() === "OPENAI"
                ? "OPENAI"
                : "ANTHROPIC";

        await voiceCallService.start({
            companyId: company.id,
            twilioCallSid: callSid,
            fromNumber,
            toNumber,
            provider: primaryProvider,
        });

        const agentConfiguration =
            await agentService.getConfiguration(
                company.id,
            );

        const domain =
            getConversationRelayDomain();

        const voiceId =
            process.env.CONVERSATION_RELAY_VOICE_ID?.trim() ||
            "IPgYtHTNLjC7Bq7IPHrm";

        const twiml =
            new twilio.twiml.VoiceResponse();

        const connect = twiml.connect();

        const relay =
            connect.conversationRelay({
                url:
                    `wss://${domain}/voice/relay/ws`,

                welcomeGreeting:
                    agentConfiguration.welcomeMessage,

                language: "fr-CA",

                ttsProvider: "ElevenLabs",

                voice: voiceId,

                interruptible: "speech",
            });

        relay.parameter({
            name: "companyId",
            value: company.id,
        });

        res
            .status(200)
            .type("text/xml")
            .send(twiml.toString());
    } catch (error) {
        next(error);
    }
}