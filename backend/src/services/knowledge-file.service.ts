import {
  basename,
  extname,
} from "node:path";

import type {
  KnowledgeSourceType,
} from "@prisma/client";

import {
  fileTypeFromBuffer,
} from "file-type";

import { AppError } from "../utils/app-error.js";

interface BinaryFileRule {
  sourceType: KnowledgeSourceType;
  mimeType: string;
  allowedExtensions: readonly string[];
}

export interface ValidatedKnowledgeFile {
  buffer: Buffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sourceType: KnowledgeSourceType;
  extension: string;
}

const BINARY_FILE_RULES: Record<
  string,
  BinaryFileRule
> = {
  pdf: {
    sourceType: "PDF",
    mimeType: "application/pdf",
    allowedExtensions: [".pdf"],
  },

  docx: {
    sourceType: "WORD",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    allowedExtensions: [".docx"],
  },

  xlsx: {
    sourceType: "EXCEL",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    allowedExtensions: [".xlsx"],
  },

  pptx: {
    sourceType: "POWERPOINT",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    allowedExtensions: [".pptx"],
  },

  jpg: {
    sourceType: "IMAGE",
    mimeType: "image/jpeg",
    allowedExtensions: [
      ".jpg",
      ".jpeg",
    ],
  },

  png: {
    sourceType: "IMAGE",
    mimeType: "image/png",
    allowedExtensions: [".png"],
  },

  tif: {
    sourceType: "IMAGE",
    mimeType: "image/tiff",
    allowedExtensions: [
      ".tif",
      ".tiff",
    ],
  },

  bmp: {
    sourceType: "IMAGE",
    mimeType: "image/bmp",
    allowedExtensions: [".bmp"],
  },
};

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".csv",
]);

function sanitizeFileName(
  originalName: string,
): string {
  const baseName = basename(
    originalName,
  ).normalize("NFKC");

  const extension =
    extname(baseName).toLowerCase();

  const nameWithoutExtension =
    baseName.slice(
      0,
      Math.max(
        0,
        baseName.length - extension.length,
      ),
    );

  const safeName = nameWithoutExtension
    .replace(
      /[^\p{L}\p{N}._() -]/gu,
      "_",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  const safeExtension = extension
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 10);

  return `${
    safeName || "document"
  }${safeExtension}`;
}

function isProbablyUtf8Text(
  buffer: Buffer,
): boolean {
  const sample = buffer.subarray(
    0,
    Math.min(
      buffer.length,
      128 * 1024,
    ),
  );

  // Les fichiers texte normaux ne doivent pas
  // contenir d’octets NUL.
  if (sample.includes(0)) {
    return false;
  }

  const text = sample.toString("utf8");

  if (!text.trim()) {
    return false;
  }

  let replacementCharacters = 0;
  let suspiciousCharacters = 0;

  for (const character of text) {
    const code = character.charCodeAt(0);

    if (character === "\uFFFD") {
      replacementCharacters += 1;
    }

    const isAllowedWhitespace =
      code === 9 ||
      code === 10 ||
      code === 13;

    if (
      (code < 32 && !isAllowedWhitespace) ||
      code === 127
    ) {
      suspiciousCharacters += 1;
    }
  }

  if (replacementCharacters > 0) {
    return false;
  }

  const suspiciousRatio =
    suspiciousCharacters /
    Math.max(text.length, 1);

  return suspiciousRatio <= 0.01;
}

function validateTextFile(
  file: Express.Multer.File,
  extension: string,
): ValidatedKnowledgeFile {
  if (!TEXT_EXTENSIONS.has(extension)) {
    throw new AppError(
      400,
      "Le format du fichier n’est pas pris en charge.",
    );
  }

  if (!isProbablyUtf8Text(file.buffer)) {
    throw new AppError(
      400,
      "Le fichier TXT ou CSV doit contenir du texte UTF-8 valide.",
    );
  }

  const isCsv = extension === ".csv";

  return {
    buffer: file.buffer,
    fileName: sanitizeFileName(
      file.originalname,
    ),
    fileSize: file.size,
    mimeType: isCsv
      ? "text/csv"
      : "text/plain",
    sourceType: isCsv
      ? "CSV"
      : "TXT",
    extension,
  };
}

export async function validateKnowledgeFile(
  file: Express.Multer.File | undefined,
): Promise<ValidatedKnowledgeFile> {
  if (!file) {
    throw new AppError(
      400,
      "Aucun fichier n’a été envoyé dans le champ « file ».",
    );
  }

  if (
    !file.buffer ||
    file.buffer.length === 0
  ) {
    throw new AppError(
      400,
      "Le fichier envoyé est vide.",
    );
  }

  const extension = extname(
    file.originalname,
  ).toLowerCase();

  const detectedType =
    await fileTypeFromBuffer(
      file.buffer,
    );

  /*
   * TXT et CSV ne possèdent pas de signature
   * binaire fiable. file-type retournera donc
   * normalement undefined pour ces formats.
   */
  if (!detectedType) {
    return validateTextFile(
      file,
      extension,
    );
  }

  const rule =
    BINARY_FILE_RULES[
      detectedType.ext
    ];

  if (!rule) {
    throw new AppError(
      400,
      "Format refusé. Formats acceptés : PDF, DOCX, XLSX, PPTX, JPG, PNG, TIFF, BMP, CSV et TXT.",
    );
  }

  if (
    !rule.allowedExtensions.includes(
      extension,
    )
  ) {
    throw new AppError(
      400,
      "L’extension du fichier ne correspond pas à son contenu réel.",
    );
  }

  return {
    buffer: file.buffer,
    fileName: sanitizeFileName(
      file.originalname,
    ),
    fileSize: file.size,
    mimeType: rule.mimeType,
    sourceType: rule.sourceType,
    extension,
  };
}