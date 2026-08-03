import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  type AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";

import type {
  ValidatedKnowledgeFile,
} from "./knowledge-file.service.js";

import { AppError } from "../utils/app-error.js";

export interface AnalyzedKnowledgeDocument {
  content: string;
  pageCount: number | null;
  extractionMode: "LOCAL_TEXT" | "AZURE_LAYOUT";
}

const MAX_ANALYZED_PAGES = 100;

function getRequiredEnvironmentVariable(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AppError(
      500,
      `La variable d’environnement ${name} est absente.`,
    );
  }

  return value;
}

function normalizeExtractedContent(
  content: string,
): string {
  return content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function analyzeLocalTextFile(
  file: ValidatedKnowledgeFile,
): AnalyzedKnowledgeDocument {
  const content = normalizeExtractedContent(
    file.buffer.toString("utf8"),
  );

  if (!content) {
    throw new AppError(
      400,
      "Le fichier ne contient aucun texte exploitable.",
    );
  }

  return {
    content,
    pageCount: null,
    extractionMode: "LOCAL_TEXT",
  };
}

async function analyzeWithAzure(
  file: ValidatedKnowledgeFile,
): Promise<AnalyzedKnowledgeDocument> {
  const endpoint =
    getRequiredEnvironmentVariable(
      "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
    );

  const key =
    getRequiredEnvironmentVariable(
      "AZURE_DOCUMENT_INTELLIGENCE_KEY",
    );

  const client = DocumentIntelligence(
    endpoint,
    {
      key,
    },
  );

  const initialResponse = await client
    .path(
      "/documentModels/{modelId}:analyze",
      "prebuilt-layout",
    )
    .post({
      contentType: "application/json",

      queryParameters: {
        outputContentFormat: "markdown",
      },

      body: {
        base64Source:
          file.buffer.toString("base64"),
      },
    });

  if (isUnexpected(initialResponse)) {
    const azureMessage =
      initialResponse.body.error?.message ??
      "Erreur Azure inconnue.";

    throw new AppError(
      502,
      `Azure n’a pas pu analyser le document : ${azureMessage}`,
    );
  }

  const poller = getLongRunningPoller(
    client,
    initialResponse,
  );

const completedResponse =
  await poller.pollUntilDone();

const operationResult =
  completedResponse.body as AnalyzeOperationOutput;

const analyzeResult =
  operationResult.analyzeResult;

  if (!analyzeResult) {
    throw new AppError(
      502,
      "Azure n’a retourné aucun résultat d’analyse.",
    );
  }

  const pageCount =
    analyzeResult.pages?.length ?? 0;

  if (pageCount > MAX_ANALYZED_PAGES) {
    throw new AppError(
      400,
      `Le document contient ${pageCount} pages. La limite AllenVoice est de ${MAX_ANALYZED_PAGES} pages.`,
    );
  }

  const content = normalizeExtractedContent(
    analyzeResult.content ?? "",
  );

  if (!content) {
    throw new AppError(
      400,
      "Aucun texte exploitable n’a pu être extrait du document.",
    );
  }

  return {
    content,
    pageCount:
      pageCount > 0
        ? pageCount
        : null,
    extractionMode: "AZURE_LAYOUT",
  };
}

export async function analyzeKnowledgeFile(
  file: ValidatedKnowledgeFile,
): Promise<AnalyzedKnowledgeDocument> {
  if (
    file.sourceType === "TXT" ||
    file.sourceType === "CSV"
  ) {
    return analyzeLocalTextFile(file);
  }

  return analyzeWithAzure(file);
}