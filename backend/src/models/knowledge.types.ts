export type KnowledgeSourceTypeInput =
  | "TEXT"
  | "FAQ"
  | "PDF"
  | "WORD"
  | "EXCEL"
  | "POWERPOINT"
  | "CSV"
  | "TXT"
  | "IMAGE";

export type KnowledgeAudienceInput =
  | "CUSTOMER"
  | "INTERNAL";

export interface CreateKnowledgeDocumentInput {
  title: string;
  category?: string;
  content: string;
  sourceType?: KnowledgeSourceTypeInput;
  audience?: KnowledgeAudienceInput;
}

export interface UpdateKnowledgeDocumentInput {
  title?: string;
  category?: string | null;
  content?: string;
  sourceType?: KnowledgeSourceTypeInput;
  audience?: KnowledgeAudienceInput;
  isActive?: boolean;
}

export interface UploadKnowledgeDocumentInput {
  title?: string;
  category?: string;
  audience?: KnowledgeAudienceInput;
}

export interface KnowledgeChunkInput {
  content: string;
  chunkIndex: number;

  sectionTitle?: string | null;
  pageNumber?: number | null;
  sheetName?: string | null;
  slideNumber?: number | null;
  locatorLabel?: string | null;
}

export interface SearchKnowledgeInput {
  query: string;
  limit?: number;
}