import { Router } from "express";

import {
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

export default voiceRouter;