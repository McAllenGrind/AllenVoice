import { Router } from "express";

import {
  handleCallStatus,
  handleIncomingCall,
  processSpeech,
} from "../controllers/voice.controller.js";

const voiceRouter = Router();

voiceRouter.post(
  "/incoming",
  handleIncomingCall,
);

voiceRouter.post(
  "/process-speech",
  processSpeech,
);

voiceRouter.post(
  "/status",
  handleCallStatus,
);

export default voiceRouter;