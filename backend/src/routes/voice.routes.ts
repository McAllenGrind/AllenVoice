import { Router } from "express";

import {
  getVoiceCall,
  handleCallStatus,
  handleIncomingCall,
  listVoiceCalls,
  processSpeech,
} from "../controllers/voice.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validateTwilioWebhook } from "../middlewares/twilio.middleware.js";

const voiceRouter = Router();

/*
 * Webhooks Twilio
 * Authentifiés par X-Twilio-Signature
 */
voiceRouter.post(
  "/incoming",
  validateTwilioWebhook,
  handleIncomingCall,
);

voiceRouter.post(
  "/process-speech",
  validateTwilioWebhook,
  processSpeech,
);

voiceRouter.post(
  "/status",
  validateTwilioWebhook,
  handleCallStatus,
);

/*
 * Dashboard AllenVoice
 * Authentifié par JWT
 */
voiceRouter.get(
  "/calls",
  authenticate,
  listVoiceCalls,
);

voiceRouter.get(
  "/calls/:id",
  authenticate,
  getVoiceCall,
);

export default voiceRouter;