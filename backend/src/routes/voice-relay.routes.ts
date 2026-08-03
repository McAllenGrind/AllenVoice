import {
  Router,
} from "express";

import {
  handleRelayAction,
  handleRelayIncomingCall,
} from "../controllers/voice-relay.controller.js";

import {
  validateTwilioWebhook,
} from "../middlewares/twilio.middleware.js";

export const voiceRelayRouter =
  Router();

voiceRelayRouter.post(
  "/incoming",
  validateTwilioWebhook,
  handleRelayIncomingCall,
);

voiceRelayRouter.post(
  "/action",
  validateTwilioWebhook,
  handleRelayAction,
);