function readPositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return defaultValue;
  }

  return parsedValue;
}

export const aiRuntimeConfig = {
  openAIModel:
    process.env.OPENAI_MODEL ?? "gpt-5-mini",

  anthropicModel:
    process.env.ANTHROPIC_MODEL ??
    "claude-sonnet-5",

  maxOutputTokens: readPositiveInteger(
    process.env.AI_MAX_OUTPUT_TOKENS,
    250,
  ),
};