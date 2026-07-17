export type KnowledgeSourceTypeInput =
  | "TEXT"
  | "FAQ"
  | "PDF"
  | "WORD";

export interface CreateKnowledgeDocumentInput {
  title: string;
  category?: string;
  content: string;
  sourceType?: KnowledgeSourceTypeInput;
}

export interface UpdateKnowledgeDocumentInput {
  title?: string;
  category?: string | null;
  content?: string;
  sourceType?: KnowledgeSourceTypeInput;
  isActive?: boolean;
}