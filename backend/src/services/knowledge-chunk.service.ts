import type {
  KnowledgeChunkInput,
} from "../models/knowledge.types.js";

interface BuildKnowledgeChunksInput {
  content: string;
  documentTitle: string;
}

const MAX_CHUNK_LENGTH = 1_800;
const MIN_CHUNK_LENGTH = 300;

function normalizeContent(
  content: string,
): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function getHeadingTitle(
  block: string,
): string | null {
  const match = block.match(
    /^#{1,6}\s+(.+)$/u,
  );

  return match?.[1]?.trim() || null;
}

function splitLongTextByWords(
  text: string,
  maximumLength: number,
): string[] {
  const words = text.split(/\s+/u);

  const pieces: string[] = [];
  let currentPiece = "";

  for (const word of words) {
    const candidate = currentPiece
      ? `${currentPiece} ${word}`
      : word;

    if (
      candidate.length > maximumLength &&
      currentPiece
    ) {
      pieces.push(currentPiece);
      currentPiece = word;
      continue;
    }

    currentPiece = candidate;
  }

  if (currentPiece) {
    pieces.push(currentPiece);
  }

  return pieces;
}

function splitOversizedBlock(
  block: string,
): string[] {
  if (block.length <= MAX_CHUNK_LENGTH) {
    return [block];
  }

  /*
   * On essaie d’abord de couper entre les phrases
   * afin de ne pas casser le sens du texte.
   */
  const sentences =
    block.match(
      /[^.!?]+(?:[.!?]+|$)/gu,
    ) ?? [block];

  const pieces: string[] = [];
  let currentPiece = "";

  for (const sentenceValue of sentences) {
    const sentence = sentenceValue.trim();

    if (!sentence) {
      continue;
    }

    if (sentence.length > MAX_CHUNK_LENGTH) {
      if (currentPiece) {
        pieces.push(currentPiece);
        currentPiece = "";
      }

      pieces.push(
        ...splitLongTextByWords(
          sentence,
          MAX_CHUNK_LENGTH,
        ),
      );

      continue;
    }

    const candidate = currentPiece
      ? `${currentPiece} ${sentence}`
      : sentence;

    if (
      candidate.length > MAX_CHUNK_LENGTH &&
      currentPiece
    ) {
      pieces.push(currentPiece);
      currentPiece = sentence;
      continue;
    }

    currentPiece = candidate;
  }

  if (currentPiece) {
    pieces.push(currentPiece);
  }

  return pieces;
}

export function buildKnowledgeChunks(
  input: BuildKnowledgeChunksInput,
): KnowledgeChunkInput[] {
  const normalizedContent =
    normalizeContent(input.content);

  if (!normalizedContent) {
    return [];
  }

  /*
   * Le découpage par lignes vides conserve normalement
   * les tableaux Markdown dans un même bloc.
   */
  const originalBlocks = normalizedContent
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks: KnowledgeChunkInput[] = [];

  let currentSection:
    | string
    | null = null;

  let bufferedBlocks: string[] = [];
  let bufferedLength = 0;

  function flushChunk(): void {
    const content = bufferedBlocks
      .join("\n\n")
      .trim();

    if (!content) {
      return;
    }

    const locatorLabel = currentSection
      ? `${input.documentTitle} — ${currentSection}`
      : input.documentTitle;

    chunks.push({
      content,
      chunkIndex: chunks.length,
      sectionTitle: currentSection,
      locatorLabel,
    });

    bufferedBlocks = [];
    bufferedLength = 0;
  }

  for (const originalBlock of originalBlocks) {
    const heading =
      getHeadingTitle(originalBlock);

    if (heading) {
      /*
       * Une nouvelle section commence :
       * on termine d’abord le passage précédent.
       */
      flushChunk();
      currentSection = heading;
      continue;
    }

    const blockPieces =
      splitOversizedBlock(originalBlock);

    for (const block of blockPieces) {
      const separatorLength =
        bufferedBlocks.length > 0
          ? 2
          : 0;

      const candidateLength =
        bufferedLength +
        separatorLength +
        block.length;

      const shouldFlush =
        bufferedBlocks.length > 0 &&
        candidateLength >
          MAX_CHUNK_LENGTH &&
        bufferedLength >=
          MIN_CHUNK_LENGTH;

      if (shouldFlush) {
        flushChunk();
      }

      bufferedBlocks.push(block);

      bufferedLength =
        bufferedBlocks
          .join("\n\n")
          .length;
    }
  }

  flushChunk();

  return chunks;
}