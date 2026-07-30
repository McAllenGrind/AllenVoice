import { aiRuntimeConfig } from "../../config/ai-runtime.js";
import { getAnthropicClient } from "../../lib/anthropic.js";

import type {
  AIProviderResult,
} from "../../models/ai.types.js";

import { AppError } from "../../utils/app-error.js";

interface GenerateAnthropicInput {
  systemPrompt: string;
  question: string;
}

interface StreamAnthropicInput
  extends GenerateAnthropicInput {
  onTextDelta: (
    delta: string,
  ) => void | Promise<void>;
}

export async function generateWithAnthropic(
  input: GenerateAnthropicInput,
): Promise<AIProviderResult> {
  const client = getAnthropicClient();
  const startedAt = Date.now();

  const response =
    await client.messages.create({
      model:
        aiRuntimeConfig.anthropicModel,

      max_tokens:
        aiRuntimeConfig.maxOutputTokens,

      system: input.systemPrompt,

      messages: [
        {
          role: "user",
          content: input.question,
        },
      ],
    });

  const answer = response.content
    .filter(
      (block) =>
        block.type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!answer) {
    throw new AppError(
      502,
      "Claude n’a retourné aucune réponse.",
    );
  }

  return {
    provider: "ANTHROPIC",
    model:
      aiRuntimeConfig.anthropicModel,
    answer,
    latencyMs:
      Date.now() - startedAt,
    inputTokens:
      response.usage.input_tokens,
    outputTokens:
      response.usage.output_tokens,
  };
}

export async function streamWithAnthropic(
  input: StreamAnthropicInput,
): Promise<AIProviderResult> {
  const client =
    getAnthropicClient();

  const startedAt =
    Date.now();

  const stream =
    client.messages.stream({
      model:
        aiRuntimeConfig.anthropicModel,

      max_tokens:
        aiRuntimeConfig.maxOutputTokens,

      system:
        input.systemPrompt,

      messages: [
        {
          role: "user",
          content: input.question,
        },
      ],
    });

  let answer = "";

  for await (const event of stream) {
    if (
      event.type ===
        "content_block_delta" &&
      event.delta.type ===
        "text_delta"
    ) {
      const delta =
        event.delta.text;

      if (!delta) {
        continue;
      }

      answer += delta;

      await input.onTextDelta(
        delta,
      );
    }
  }

  const finalMessage =
    await stream.finalMessage();

  const normalizedAnswer =
    answer.trim();

  if (!normalizedAnswer) {
    throw new AppError(
      502,
      "Claude n’a retourné aucune réponse.",
    );
  }

  return {
    provider: "ANTHROPIC",

    model:
      aiRuntimeConfig.anthropicModel,

    answer:
      normalizedAnswer,

    latencyMs:
      Date.now() - startedAt,

    inputTokens:
      finalMessage.usage.input_tokens,

    outputTokens:
      finalMessage.usage.output_tokens,
  };
}