import OpenAI from "openai";
import { AppError } from "../utils/app-error.js";

let openAIClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AppError(
      503,
      "La clé API OpenAI n’est pas configurée.",
    );
  }

  openAIClient ??= new OpenAI({
    apiKey,
  });

  return openAIClient;
}