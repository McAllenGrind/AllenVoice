export type AIProvider =
  | "OPENAI"
  | "ANTHROPIC";

export interface AskAIInput {
  question: string;

  /*
   * Texte utilisé uniquement pour rechercher
   * les passages dans la base de connaissances.
   *
   * Lorsqu’il est absent, question est utilisée.
   */
  knowledgeQuery?: string;

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