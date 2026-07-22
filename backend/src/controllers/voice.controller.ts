import type {
  Request,
  Response,
} from "express";

import twilio from "twilio";

import type {
  AIProvider,
} from "../models/ai.types.js";

import { aiService } from "../services/ai.service.js";

const VOICE_LANGUAGE = "fr-CA";

interface TwilioSpeechBody {
  SpeechResult?: string;
  Confidence?: string;
  CallSid?: string;
  From?: string;
  To?: string;
}

function sendTwiml(
  res: Response,
  twiml: twilio.twiml.VoiceResponse,
): void {
  res
    .status(200)
    .type("text/xml")
    .send(twiml.toString());
}

function addSpeechGather(
  twiml: twilio.twiml.VoiceResponse,
  prompt: string,
): void {
  const gather = twiml.gather({
    input: ["speech"],
    action: "/voice/process-speech",
    method: "POST",
    language: VOICE_LANGUAGE,

    // Attend jusqu’à 5 secondes que la personne commence.
    timeout: 5,

    // Attend 1 secondes après une pause avant
    // de considérer que la personne a terminé.
    speechTimeout: "1",

    // Appelle process-speech même si rien n’a été entendu.
    actionOnEmptyResult: true,
  });

  gather.say(
    {
      language: VOICE_LANGUAGE,
    },
    prompt,
  );
}

function getVoiceCompanyId(): string {
  const companyId =
    process.env.VOICE_COMPANY_ID?.trim();

  if (!companyId) {
    throw new Error(
      "VOICE_COMPANY_ID n’est pas configuré.",
    );
  }

  return companyId;
}

function getVoiceProvider(): AIProvider {
  const configuredProvider =
    process.env.VOICE_AI_PROVIDER
      ?.trim()
      .toUpperCase();

  if (configuredProvider === "OPENAI") {
    return "OPENAI";
  }

  return "ANTHROPIC";
}

function normalizeSpeech(value: string): string {
  return value
    // Sépare les lettres et les accents.
    .normalize("NFD")

    // Supprime les accents : « terminé » devient « termine ».
    .replace(/\p{Diacritic}/gu, "")

    .toLowerCase()

    // Remplace les apostrophes par des espaces.
    .replace(/[’']/g, " ")

    // Supprime la ponctuation.
    .replace(/[^a-z0-9\s]/g, " ")

    // Supprime les espaces en trop.
    .replace(/\s+/g, " ")
    .trim();
}

function isEndOfCallRequest(
  question: string,
): boolean {
  const normalized =
    normalizeSpeech(question);

  const endPatterns: RegExp[] = [
    /^au revoir$/,
    /^aurevoir$/,
    /^a plus$/,
    /^bonne journee$/,
    /^bonne soiree$/,
    /^bonne nuit$/,

    /^merci$/,
    /^non merci$/,
    /^merci beaucoup$/,

    /^c est tout$/,
    /^ce sera tout$/,
    /^ca sera tout$/,
    /^c est bon$/,
    /^ca va etre tout$/,

    /^je n ai plus de questions?$/,
    /^je n ai pas d autres questions?$/,
    /^je n ai rien d autre$/,
    /^j ai termine$/,
    /^j ai fini$/,

    /^on peut raccrocher$/,
    /^vous pouvez raccrocher$/,
    /^tu peux raccrocher$/,
    /^raccrochez$/,
    /^termine$/,
  ];

  return endPatterns.some((pattern) =>
    pattern.test(normalized),
  );
}

export function handleIncomingCall(
  _req: Request,
  res: Response,
): void {
  const twiml =
    new twilio.twiml.VoiceResponse();

  addSpeechGather(
    twiml,
    "Bonjour et bienvenue à la Clinique Allen. Je suis votre assistant virtuel. Comment puis-je vous aider ?",
  );

  sendTwiml(res, twiml);
}

export async function processSpeech(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as TwilioSpeechBody;

  const question =
    body.SpeechResult?.trim() ?? "";

  console.log("APPEL TWILIO :", {
    callSid: body.CallSid,
    from: body.From,
    to: body.To,
    question,
    confidence: body.Confidence,
  });

  const twiml =
    new twilio.twiml.VoiceResponse();

  /*
   * Twilio n’a pas entendu de question.
   * On termine proprement pour éviter
   * une boucle silencieuse et des frais inutiles.
   */
  if (!question) {
    twiml.say(
      {
        language: VOICE_LANGUAGE,
      },
      "Je n’ai rien entendu. Merci d’avoir appelé la Clinique Allen. Au revoir.",
    );

    twiml.hangup();

    sendTwiml(res, twiml);
    return;
  }

  /*
   * Le client veut terminer la conversation.
   */
  if (isEndOfCallRequest(question)) {
    twiml.say(
      {
        language: VOICE_LANGUAGE,
      },
      "Merci d’avoir appelé la Clinique Allen. Au revoir.",
    );

    twiml.hangup();

    sendTwiml(res, twiml);
    return;
  }

  try {
    const companyId = getVoiceCompanyId();
    const provider = getVoiceProvider();

    const result = await aiService.ask(
      companyId,
      {
        question,
        provider,
      },
    );

    /*
     * Twilio prononce la réponse générée
     * par Claude ou OpenAI.
     */
    twiml.say(
      {
        language: VOICE_LANGUAGE,
      },
      result.answer,
    );

    /*
     * Puis Twilio écoute une nouvelle question.
     */
    addSpeechGather(
      twiml,
      "Avez-vous une autre question ? Vous pouvez dire c’est tout pour terminer l’appel.",
    );
  } catch (error) {
    console.error(
      "ERREUR AGENT VOCAL :",
      error,
    );

    twiml.say(
      {
        language: VOICE_LANGUAGE,
      },
      "Je suis désolé, une erreur est survenue pendant le traitement de votre question.",
    );

    addSpeechGather(
      twiml,
      "Vous pouvez reformuler votre question.",
    );
  }

  sendTwiml(res, twiml);
}