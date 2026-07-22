import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "../utils/app-error.js";

let anthropicClient: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AppError(
      503,
      "La clé API Anthropic n’est pas configurée.",
    );
  }

  anthropicClient ??= new Anthropic({
    apiKey,
  });

  return anthropicClient;
}