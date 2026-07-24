import type {
  NextFunction,
  Request,
  Response,
} from "express";

import twilio from "twilio";

import type { AIProvider, } from "../models/ai.types.js";

import { aiService } from "../services/ai.service.js";

import { voiceCallService } from "../services/voice-call.service.js";

import { AppError } from "../utils/app-error.js";

const VOICE_LANGUAGE = "fr-CA";

interface TwilioSpeechBody {
  SpeechResult?: string;
  Confidence?: string;
  CallSid?: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  CallDuration?: string;
}

async function runHistorySafely(
  description: string,
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    /*
     * Une erreur d’historique ne doit pas
     * interrompre la conversation téléphonique.
     */
    console.error(
      `ERREUR HISTORIQUE VOCAL — ${description} :`,
      error,
    );
  }
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

export async function handleIncomingCall(
  req: Request,
  res: Response,
): Promise<void> {
  const body =
    req.body as TwilioSpeechBody;

  const callSid =
    body.CallSid?.trim();

  const companyId =
    getVoiceCompanyId();

  const provider =
    getVoiceProvider();

  if (callSid) {
    await runHistorySafely(
      "création de l’appel",
      () =>
        voiceCallService.start({
          companyId,
          twilioCallSid: callSid,
          fromNumber: body.From,
          toNumber: body.To,
          provider,
        }),
    );
  } else {
    console.warn(
      "Twilio n’a pas envoyé de CallSid.",
    );
  }

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

    const callSid =
  body.CallSid?.trim();

const companyId =
  getVoiceCompanyId();

const provider =
  getVoiceProvider();

if (callSid) {
  /*
   * Cette opération garantit que l’appel existe,
   * même si la création initiale avait échoué.
   */
  await runHistorySafely(
    "vérification de l’appel",
    () =>
      voiceCallService.start({
        companyId,
        twilioCallSid: callSid,
        fromNumber: body.From,
        toNumber: body.To,
        provider,
      }),
  );
}

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
  if (callSid) {
    await runHistorySafely(
      "fin de l’appel sans parole",
      () =>
        voiceCallService.complete(
          callSid,
        ),
    );
  }

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
if (callSid) {
  await runHistorySafely(
    "message du client",
    () =>
      voiceCallService.recordCustomerMessage(
        callSid,
        question,
        body.Confidence,
      ),
  );
}

  /*
   * Le client veut terminer la conversation.
   */
  if (isEndOfCallRequest(question)) {
  if (callSid) {
    await runHistorySafely(
      "fin volontaire de l’appel",
      () =>
        voiceCallService.complete(
          callSid,
        ),
    );
  }

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
      {
        recordEvaluation: false,
      },
    );

    if (callSid) {
  await runHistorySafely(
    "réponse de l’agent",
    () =>
      voiceCallService.recordAgentMessage(
        callSid,
        result,
      ),
  );
}

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

export async function handleCallStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const body =
    req.body as TwilioSpeechBody;

  const callSid =
    body.CallSid?.trim();

  console.log("STATUT APPEL TWILIO :", {
    callSid,
    status: body.CallStatus,
    durationSeconds:
      body.CallDuration,
  });

  if (callSid) {
    await runHistorySafely(
      "mise à jour du statut Twilio",
      () =>
        voiceCallService.updateFromTwilioStatus(
          callSid,
          body.CallStatus,
          body.CallDuration,
        ),
    );
  }

  /*
   * Un webhook de statut est informatif.
   * Twilio attend simplement une réponse HTTP réussie.
   */
  res.sendStatus(200);
}


export async function listVoiceCalls(
  _req: Request,
  res: Response,
  next: import("express").NextFunction,
): Promise<void> {
  try {
    const auth =
      res.locals.auth as {
        companyId: string;
      };

    const calls =
      await voiceCallService.list(
        auth.companyId,
      );

    res.status(200).json({
      data: calls,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVoiceCall(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth =
      res.locals.auth as {
        companyId: string;
      };

    const id = req.params.id;

    /*
     * TypeScript veut qu'on vérifie que :id
     * est bien une chaîne avant de l'utiliser.
     */
    if (
      typeof id !== "string" ||
      !id.trim()
    ) {
      throw new AppError(
        400,
        "Identifiant d’appel invalide.",
      );
    }

    const call =
      await voiceCallService.getById(
        id,
        auth.companyId,
      );

    res.status(200).json({
      data: call,
    });
  } catch (error) {
    next(error);
  }
}