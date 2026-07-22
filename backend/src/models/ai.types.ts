export type AIProvider =
  | "OPENAI"
  | "ANTHROPIC";

export interface AskAIInput {
  question: string;
  provider?: AIProvider;
}

export interface AIProviderResult {
  provider: AIProvider;
  model: string;
  answer: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIComparisonFailure {
  provider: AIProvider;
  error: string;
}