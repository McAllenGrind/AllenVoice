import { aiRuntimeConfig } from "../../config/ai-runtime.js";
import { getOpenAIClient } from "../../lib/openai.js";
import type { AIProviderResult } from "../../models/ai.types.js";
import { AppError } from "../../utils/app-error.js";

interface GenerateOpenAIInput {
  systemPrompt: string;
  question: string;
}

export async function generateWithOpenAI(
  input: GenerateOpenAIInput,
): Promise<AIProviderResult> {
  const client = getOpenAIClient();
  const startedAt = Date.now();

  try {
    const response = await client.responses.create({
      model: aiRuntimeConfig.openAIModel,

      reasoning: {
        effort: "low",
      },

      instructions: input.systemPrompt,
      input: input.question,

      max_output_tokens:
        aiRuntimeConfig.maxOutputTokens,
    });
    const answer = response.output_text.trim();

    console.log("OPENAI STATUS :", response.status);
    console.log(
      "OPENAI INCOMPLETE DETAILS :",
      response.incomplete_details
    );
    console.log("OPENAI USAGE :", response.usage);

    if (!answer) {
      throw new AppError(
        502,
        "OpenAI n’a retourné aucune réponse.",
      );
    }

    return {
      provider: "OPENAI",
      model: aiRuntimeConfig.openAIModel,
      answer,
      latencyMs: Date.now() - startedAt,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    };
  } catch (error: unknown) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? error.status
        : undefined;

    if (status === 429) {
      throw new AppError(
        429,
        "Le quota OpenAI est épuisé. Vérifiez les crédits et la facturation API.",
      );
    }

    throw error;
  }
}