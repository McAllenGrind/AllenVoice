import { aiRuntimeConfig } from "../../config/ai-runtime.js";
import { getOpenAIClient } from "../../lib/openai.js";

import type {
  AIProviderResult,
} from "../../models/ai.types.js";

import { AppError } from "../../utils/app-error.js";

interface GenerateOpenAIInput {
  systemPrompt: string;
  question: string;
}

interface StreamOpenAIInput
  extends GenerateOpenAIInput {
  signal?: AbortSignal;

  onTextDelta: (
    delta: string,
  ) => void | Promise<void>;
}

function getErrorStatus(
  error: unknown,
): number | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return undefined;
  }

  const status =
    (error as {
      status?: unknown;
    }).status;

  return typeof status === "number"
    ? status
    : undefined;
}

function throwNormalizedOpenAIError(
  error: unknown,
): never {
  if (getErrorStatus(error) === 429) {
    throw new AppError(
      429,
      "Le quota OpenAI est épuisé. Vérifiez les crédits et la facturation API.",
    );
  }

  throw error;
}

export async function generateWithOpenAI(
  input: GenerateOpenAIInput,
): Promise<AIProviderResult> {
  const client = getOpenAIClient();
  const startedAt = Date.now();

  try {
    const response =
      await client.responses.create({
        model:
          aiRuntimeConfig.openAIModel,

        reasoning: {
          effort: "low",
        },

        instructions:
          input.systemPrompt,

        input: input.question,

        max_output_tokens:
          aiRuntimeConfig
            .maxOutputTokens,
      });

    const answer =
      response.output_text.trim();

    if (!answer) {
      throw new AppError(
        502,
        "OpenAI n’a retourné aucune réponse.",
      );
    }

    return {
      provider: "OPENAI",
      model:
        aiRuntimeConfig.openAIModel,
      answer,
      latencyMs:
        Date.now() - startedAt,
      inputTokens:
        response.usage?.input_tokens,
      outputTokens:
        response.usage?.output_tokens,
    };
  } catch (error: unknown) {
    throwNormalizedOpenAIError(error);
  }
}

export async function streamWithOpenAI(
  input: StreamOpenAIInput,
): Promise<AIProviderResult> {
  const client = getOpenAIClient();
  const startedAt = Date.now();

  let answer = "";
  let inputTokens:
    | number
    | undefined;

  let outputTokens:
    | number
    | undefined;

  try {
    const requestOptions =
      input.signal
        ? {
          signal: input.signal,
        }
        : undefined;

    const stream =
      await client.responses.create(
        {
          model:
            aiRuntimeConfig.openAIModel,

          reasoning: {
            effort: "low",
          },

          instructions:
            input.systemPrompt,

          input: input.question,

          max_output_tokens:
            aiRuntimeConfig
              .maxOutputTokens,

          stream: true,
        },
        requestOptions,
      );

    for await (const event of stream) {
      if (
        event.type ===
        "response.output_text.delta"
      ) {
        const delta = event.delta;

        if (!delta) {
          continue;
        }

        answer += delta;

        await input.onTextDelta(
          delta,
        );
      }

      if (
        event.type ===
        "response.completed"
      ) {
        inputTokens =
          event.response.usage
            ?.input_tokens;

        outputTokens =
          event.response.usage
            ?.output_tokens;
      }
    }

    const normalizedAnswer =
      answer.trim();

    if (!normalizedAnswer) {
      throw new AppError(
        502,
        "OpenAI n’a retourné aucune réponse.",
      );
    }

    return {
      provider: "OPENAI",
      model:
        aiRuntimeConfig.openAIModel,
      answer: normalizedAnswer,
      latencyMs:
        Date.now() - startedAt,
      inputTokens,
      outputTokens,
    };
  } catch (error: unknown) {
    throwNormalizedOpenAIError(error);
  }
}