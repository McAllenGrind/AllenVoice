import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocuments,
  updateKnowledgeDocument,
  uploadKnowledgeDocument,
  type KnowledgeAudience,
  type KnowledgeDocument,
  type KnowledgeDocumentStatus,
  type KnowledgeSourceType,
} from "../api/api";
import "./KnowledgePage.css";

function formatFileSize(
  size: number | null,
): string {
  if (size === null) {
    return "Taille inconnue";
  }

  if (size < 1024) {
    return `${size} octets`;
  }

  const kilobytes =
    size / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} Ko`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(1)} Mo`;
}

function formatDate(
  dateString: string,
): string {
  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(dateString),
  );
}

function getStatusLabel(
  status: KnowledgeDocumentStatus,
): string {
  switch (status) {
    case "PROCESSING":
      return "Traitement en cours";

    case "READY":
      return "Prêt";

    case "FAILED":
      return "Échec";

    default:
      return status;
  }
}

function getSourceTypeLabel(
  sourceType: KnowledgeSourceType,
): string {
  switch (sourceType) {
    case "TEXT":
      return "Texte";

    case "FAQ":
      return "FAQ";

    case "PDF":
      return "PDF";

    case "WORD":
      return "Word";

    case "EXCEL":
      return "Excel";

    case "POWERPOINT":
      return "PowerPoint";

    case "CSV":
      return "CSV";

    case "TXT":
      return "TXT";

    case "IMAGE":
      return "Image";

    default:
      return sourceType;
  }
}

function getContentPreview(
  content: string,
): string {
  const normalized =
    content.trim();

  if (!normalized) {
    return "Aucun aperçu disponible.";
  }

  if (normalized.length <= 240) {
    return normalized;
  }

  return `${normalized.slice(0, 240)}...`;
}

function getDefaultTitle(
  fileName: string,
): string {
  return fileName.replace(
    /\.[^/.]+$/,
    "",
  );
}

export default function KnowledgePage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [documents, setDocuments] =
    useState<KnowledgeDocument[]>([]);

  const [title, setTitle] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [content, setContent] =
    useState("");

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const [
    uploadTitle,
    setUploadTitle,
  ] = useState("");

  const [
    uploadCategory,
    setUploadCategory,
  ] = useState("");

  const [
    uploadAudience,
    setUploadAudience,
  ] = useState<KnowledgeAudience>(
    "CUSTOMER",
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    pendingDocumentId,
    setPendingDocumentId,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadKnowledge =
    useCallback(
      async (
        showPageLoader = false,
      ) => {
        if (showPageLoader) {
          setIsLoading(true);
        }

        try {
          const data =
            await getKnowledgeDocuments();

          setDocuments(data);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Impossible d’actualiser les documents.",
          );
        } finally {
          if (showPageLoader) {
            setIsLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    void loadKnowledge(true);
  }, [loadKnowledge]);

  useEffect(() => {
    const hasProcessingDocument =
      documents.some(
        (document) =>
          document.status ===
          "PROCESSING",
      );

    if (!hasProcessingDocument) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        void loadKnowledge();
      }, 3000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    documents,
    loadKnowledge,
  ]);

function clearMessages() {
  setError(null);
  setSuccess(null);
}

function resetManualForm() {
  setTitle("");
  setCategory("");
  setContent("");
  setEditingId(null);
}

function resetUploadForm() {
  setSelectedFile(null);
  setUploadTitle("");
  setUploadCategory("");
  setUploadAudience(
    "CUSTOMER",
  );

  if (fileInputRef.current) {
    fileInputRef.current.value =
      "";
  }
}

function handleFileChange(
  file: File | null,
) {
  setSelectedFile(file);

  if (
    file &&
    !uploadTitle.trim()
  ) {
    setUploadTitle(
      getDefaultTitle(
        file.name,
      ),
    );
  }
}

async function handleUpload(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  clearMessages();

  if (!selectedFile) {
    setError(
      "Sélectionnez un fichier à importer.",
    );

    return;
  }

  if (!uploadTitle.trim()) {
    setError(
      "Ajoutez un titre au document.",
    );

    return;
  }

  setIsUploading(true);

  try {
    const created =
      await uploadKnowledgeDocument({
        file: selectedFile,
        title:
          uploadTitle.trim(),
        category:
          uploadCategory.trim() ||
          undefined,
        audience:
          uploadAudience,
      });

    setDocuments((current) => [
      created,
      ...current.filter(
        (document) =>
          document.id !==
          created.id,
      ),
    ]);

    setSuccess(
      `Le fichier « ${selectedFile.name} » a été importé.`,
    );

    resetUploadForm();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Impossible d’importer ce fichier.",
    );
  } finally {
    setIsUploading(false);
  }
}

function handleEdit(
  document: KnowledgeDocument,
) {
  clearMessages();

  setEditingId(
    document.id,
  );

  setTitle(
    document.title,
  );

  setCategory(
    document.category ?? "",
  );

  setContent(
    document.content,
  );
}

async function handleSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  clearMessages();
  setIsSaving(true);

  try {
    if (editingId) {
      const updated =
        await updateKnowledgeDocument(
          editingId,
          {
            title:
              title.trim(),
            category:
              category.trim(),
            content:
              content.trim(),
          },
        );

      setDocuments((current) =>
        current.map(
          (document) =>
            document.id ===
              updated.id
              ? updated
              : document,
        ),
      );

      setSuccess(
        "L’information a été modifiée.",
      );
    } else {
      const created =
        await createKnowledgeDocument({
          title:
            title.trim(),
          category:
            category.trim() ||
            undefined,
          content:
            content.trim(),
          sourceType:
            "TEXT",
          isActive:
            true,
        });

      setDocuments((current) => [
        created,
        ...current,
      ]);

      setSuccess(
        "L’information a été ajoutée.",
      );
    }

    resetManualForm();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Une erreur est survenue.",
    );
  } finally {
    setIsSaving(false);
  }
}

async function handleDelete(
  document: KnowledgeDocument,
) {
  const confirmed =
    window.confirm(
      `Supprimer « ${document.title} » ?`,
    );

  if (!confirmed) {
    return;
  }

  clearMessages();

  setPendingDocumentId(
    document.id,
  );

  try {
    await deleteKnowledgeDocument(
      document.id,
    );

    setDocuments((current) =>
      current.filter(
        (item) =>
          item.id !==
          document.id,
      ),
    );

    if (
      editingId ===
      document.id
    ) {
      resetManualForm();
    }

    setSuccess(
      "Le document a été supprimé.",
    );
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Impossible de supprimer ce document.",
    );
  } finally {
    setPendingDocumentId(
      null,
    );
  }
}

async function handleToggleActive(
  document: KnowledgeDocument,
) {
  clearMessages();

  setPendingDocumentId(
    document.id,
  );

  try {
    const updated =
      await updateKnowledgeDocument(
        document.id,
        {
          isActive:
            !document.isActive,
        },
      );

    setDocuments((current) =>
      current.map(
        (item) =>
          item.id ===
            updated.id
            ? updated
            : item,
      ),
    );

    setSuccess(
      updated.isActive
        ? "Le document est maintenant actif."
        : "Le document est maintenant désactivé.",
    );
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Impossible de modifier le statut.",
    );
  } finally {
    setPendingDocumentId(
      null,
    );
  }
}

if (isLoading) {
  return (
    <p>
      Chargement de la base de
      connaissances...
    </p>
  );
}

return (
  <section className="knowledge-page">
    <h1>
      Base de connaissances
    </h1>

    <p>
      Ajoutez les informations
      qu’AllenVoice peut utiliser pour
      répondre aux clients.
    </p>

    {error && (
      <p
        className="knowledge-message knowledge-message--error"
        role="alert"
      >
        {error}
      </p>
    )}

    {success && (
      <p
        className="knowledge-message knowledge-message--success"
        role="status"
      >
        {success}
      </p>
    )}

    <hr />

    <h2>
      Importer un fichier
    </h2>

    <p>
      Formats acceptés : PDF, Word,
      Excel, PowerPoint, CSV, TXT, PNG
      et JPG.
    </p>

    <form
      className="knowledge-form"
      onSubmit={handleUpload}
    >
      <div>
        <label htmlFor="knowledge-file">
          Fichier
        </label>

        <input
          ref={fileInputRef}
          id="knowledge-file"
          type="file"
          required
          accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt,.png,.jpg,.jpeg"
          onChange={(event) =>
            handleFileChange(
              event.target.files?.[0] ??
              null,
            )
          }
        />
      </div>

      <div>
        <label htmlFor="upload-title">
          Titre
        </label>

        <input
          id="upload-title"
          type="text"
          required
          value={uploadTitle}
          onChange={(event) =>
            setUploadTitle(
              event.target.value,
            )
          }
        />
      </div>

      <div>
        <label htmlFor="upload-category">
          Catégorie
        </label>

        <input
          id="upload-category"
          type="text"
          placeholder="Ex. Promotions, horaires, tarifs"
          value={uploadCategory}
          onChange={(event) =>
            setUploadCategory(
              event.target.value,
            )
          }
        />
      </div>

      <div>
        <label htmlFor="upload-audience">
          Audience
        </label>

        <select
          id="upload-audience"
          value={uploadAudience}
          onChange={(event) =>
            setUploadAudience(
              event.target
                .value as KnowledgeAudience,
            )
          }
        >
          <option value="CUSTOMER">
            Clients
          </option>

          <option value="INTERNAL">
            Interne
          </option>
        </select>
      </div>

      {selectedFile && (
        <p>
          Fichier sélectionné :{" "}
          <strong>
            {selectedFile.name}
          </strong>{" "}
          —{" "}
          {formatFileSize(
            selectedFile.size,
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={
          isUploading ||
          !selectedFile
        }
      >
        {isUploading
          ? "Importation en cours..."
          : "Importer le document"}
      </button>
    </form>

    <hr />

    <h2>
      Ajouter une information
      manuellement
    </h2>

    <form
      className="knowledge-form"
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="title">
          Titre
        </label>

        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) =>
            setTitle(
              event.target.value,
            )
          }
        />
      </div>

      <div>
        <label htmlFor="category">
          Catégorie
        </label>

        <input
          id="category"
          type="text"
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value,
            )
          }
        />
      </div>

      <div>
        <label htmlFor="content">
          Information
        </label>

        <textarea
          id="content"
          required
          rows={6}
          value={content}
          onChange={(event) =>
            setContent(
              event.target.value,
            )
          }
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
      >
        {isSaving
          ? "Enregistrement..."
          : editingId
            ? "Enregistrer les modifications"
            : "Ajouter l’information"}
      </button>

      {editingId && (
        <button
          type="button"
          onClick={
            resetManualForm
          }
        >
          Annuler
        </button>
      )}
    </form>

    <hr />

    <h2>
      Documents enregistrés
    </h2>

    <button
      type="button"
      onClick={() =>
        void loadKnowledge()
      }
    >
      Actualiser les documents
    </button>

    {documents.length === 0 ? (
      <p>
        Aucun document enregistré.
      </p>
    ) : (
      <div className="knowledge-list">
        {documents.map(
          (document) => {
            const isManual =
              document.sourceType ===
              "TEXT" ||
              document.sourceType ===
              "FAQ";

            const isPending =
              pendingDocumentId ===
              document.id;

            const canActivate =
              document.status ===
              "READY";

            return (
              <article
                className="knowledge-card"
                key={document.id}
              >
                <h3>
                  {document.title}
                </h3>

                <p>
                  <strong>
                    Type :
                  </strong>{" "}
                  {getSourceTypeLabel(
                    document.sourceType,
                  )}
                </p>

                <p>
                  <strong>
                    Traitement :
                  </strong>{" "}
                  {getStatusLabel(
                    document.status,
                  )}
                </p>

                <p>
                  <strong>
                    Utilisation par
                    l’agent :
                  </strong>{" "}
                  {document.isActive
                    ? "Actif"
                    : "Inactif"}
                </p>

                {document.category && (
                  <p>
                    <strong>
                      Catégorie :
                    </strong>{" "}
                    {document.category}
                  </p>
                )}

                {document.fileName && (
                  <p>
                    <strong>
                      Fichier :
                    </strong>{" "}
                    {document.fileName}
                  </p>
                )}

                {document.fileSize !==
                  null && (
                    <p>
                      <strong>
                        Taille :
                      </strong>{" "}
                      {formatFileSize(
                        document.fileSize,
                      )}
                    </p>
                  )}

                {document.pageCount !==
                  null && (
                    <p>
                      <strong>
                        Pages :
                      </strong>{" "}
                      {document.pageCount}
                    </p>
                  )}

                {document._count && (
                  <p>
                    <strong>
                      Chunks :
                    </strong>{" "}
                    {
                      document._count
                        .chunks
                    }
                  </p>
                )}

                {document.failureReason && (
                  <p role="alert">
                    <strong>
                      Erreur :
                    </strong>{" "}
                    {
                      document.failureReason
                    }
                  </p>
                )}

                <p>
                  <strong>
                    Aperçu :
                  </strong>{" "}
                  {getContentPreview(
                    document.content,
                  )}
                </p>

                <p>
                  Ajouté le{" "}
                  {formatDate(
                    document.createdAt,
                  )}
                </p>

                {isManual && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleEdit(
                        document,
                      )
                    }
                  >
                    Modifier
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    isPending ||
                    !canActivate
                  }
                  onClick={() =>
                    void handleToggleActive(
                      document,
                    )
                  }
                >
                  {isPending
                    ? "Modification..."
                    : document.isActive
                      ? "Désactiver"
                      : "Activer"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    void handleDelete(
                      document,
                    )
                  }
                >
                  {isPending
                    ? "Traitement..."
                    : "Supprimer"}
                </button>

                <hr />
              </article>
            );
          },
        )}
      </div>
    )}
  </section>
);
}