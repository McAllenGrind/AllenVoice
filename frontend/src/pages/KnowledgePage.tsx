import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
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

type KnowledgeIconName =
  | "check"
  | "chevron"
  | "close"
  | "document"
  | "edit"
  | "file"
  | "filter"
  | "plus"
  | "refresh"
  | "search"
  | "trash"
  | "upload"
  | "warning";

type PanelMode = "manual" | "upload";

interface KnowledgeIconProps {
  name: KnowledgeIconName;
  className?: string;
}

function KnowledgeIcon({
  name,
  className = "",
}: KnowledgeIconProps) {
  const commonProps = {
    "aria-hidden": true,
    className,
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "check":
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...commonProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "close":
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );

    case "document":
      return (
        <svg {...commonProps}>
          <path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          <path d="M14 2v5h5" />
          <path d="M8 12h8" />
          <path d="M8 16h6" />
        </svg>
      );

    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" />
        </svg>
      );

    case "file":
      return (
        <svg {...commonProps}>
          <path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          <path d="M14 2v6h6" />
        </svg>
      );

    case "filter":
      return (
        <svg {...commonProps}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );

    case "plus":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M20 6v5h-5" />
          <path d="M18.2 16a8 8 0 1 1 .8-8.9L20 11" />
        </svg>
      );

    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="m7 7 1 14h8l1-14" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );

    case "upload":
      return (
        <svg {...commonProps}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      );

    case "warning":
      return (
        <svg {...commonProps}>
          <path d="M10.3 3.8 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

function formatFileSize(size: number | null): string {
  if (size === null) {
    return "—";
  }

  if (size < 1024) {
    return `${size} o`;
  }

  const kilobytes = size / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} Ko`;
  }

  return `${(kilobytes / 1024).toFixed(1)} Mo`;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getStatusLabel(
  status: KnowledgeDocumentStatus,
): string {
  switch (status) {
    case "PROCESSING":
      return "Traitement";
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

function getDefaultTitle(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function LoadingState() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de la base de connaissances"
      className="knowledge-page knowledge-page--loading"
    >
      <div className="knowledge-loading-heading" />
      <div className="knowledge-loading-subheading" />
      <div className="knowledge-loading-toolbar" />
      <div className="knowledge-loading-table" />
    </section>
  );
}

export default function KnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] =
    useState<KnowledgeDocument[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("ALL");

  const [isPanelOpen, setIsPanelOpen] =
    useState(false);
  const [panelMode, setPanelMode] =
    useState<PanelMode>("manual");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] =
    useState("");
  const [uploadAudience, setUploadAudience] =
    useState<KnowledgeAudience>("CUSTOMER");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] =
    useState(false);
  const [pendingDocumentId, setPendingDocumentId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const loadKnowledge = useCallback(
    async (showPageLoader = false) => {
      if (showPageLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await getKnowledgeDocuments();
        setDocuments(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible d’actualiser les documents.",
        );
      } finally {
        if (showPageLoader) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadKnowledge(true);
  }, [loadKnowledge]);

  useEffect(() => {
    const hasProcessingDocument = documents.some(
      (document) => document.status === "PROCESSING",
    );

    if (!hasProcessingDocument) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadKnowledge();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [documents, loadKnowledge]);

  const categories = useMemo(() => {
    const values = new Set<string>();

    documents.forEach((document) => {
      const value = document.category?.trim();
      if (value) {
        values.add(value);
      }
    });

    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, "fr"),
    );
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesCategory =
        categoryFilter === "ALL" ||
        document.category === categoryFilter;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        document.title,
        document.category ?? "",
        document.fileName ?? "",
        document.content,
        getSourceTypeLabel(document.sourceType),
      ].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [categoryFilter, documents, search]);

  const readyCount = useMemo(
    () =>
      documents.filter(
        (document) => document.status === "READY",
      ).length,
    [documents],
  );

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
    setUploadAudience("CUSTOMER");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openCreatePanel(mode: PanelMode = "manual") {
    clearMessages();
    resetManualForm();
    resetUploadForm();
    setPanelMode(mode);
    setIsPanelOpen(true);
  }

  function closePanel() {
    if (isSaving || isUploading) {
      return;
    }

    setIsPanelOpen(false);
    resetManualForm();
    resetUploadForm();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (file && !uploadTitle.trim()) {
      setUploadTitle(getDefaultTitle(file.name));
    }
  }

  function handleEdit(document: KnowledgeDocument) {
    clearMessages();
    resetUploadForm();
    setPanelMode("manual");
    setEditingId(document.id);
    setTitle(document.title);
    setCategory(document.category ?? "");
    setContent(document.content);
    setIsPanelOpen(true);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    clearMessages();

    if (!selectedFile) {
      setError("Sélectionnez un fichier à importer.");
      return;
    }

    if (!uploadTitle.trim()) {
      setError("Ajoutez un titre au document.");
      return;
    }

    setIsUploading(true);

    try {
      const created = await uploadKnowledgeDocument({
        file: selectedFile,
        title: uploadTitle.trim(),
        category: uploadCategory.trim() || undefined,
        audience: uploadAudience,
      });

      setDocuments((current) => [
        created,
        ...current.filter(
          (document) => document.id !== created.id,
        ),
      ]);

      setSuccess(
        `Le fichier « ${selectedFile.name} » a été importé.`,
      );
      resetUploadForm();
      setIsPanelOpen(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Impossible d’importer ce fichier.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    clearMessages();

    if (!title.trim() || !content.trim()) {
      setError("Le titre et le contenu sont obligatoires.");
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await updateKnowledgeDocument(
          editingId,
          {
            title: title.trim(),
            category: category.trim(),
            content: content.trim(),
          },
        );

        setDocuments((current) =>
          current.map((document) =>
            document.id === updated.id ? updated : document,
          ),
        );

        setSuccess("La connaissance a été modifiée.");
      } else {
        const created = await createKnowledgeDocument({
          title: title.trim(),
          category: category.trim() || undefined,
          content: content.trim(),
          sourceType: "TEXT",
          isActive: true,
        });

        setDocuments((current) => [created, ...current]);
        setSuccess("La connaissance a été ajoutée.");
      }

      resetManualForm();
      setIsPanelOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(document: KnowledgeDocument) {
    const confirmed = window.confirm(
      `Supprimer « ${document.title} » ?`,
    );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setPendingDocumentId(document.id);

    try {
      await deleteKnowledgeDocument(document.id);

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );

      if (editingId === document.id) {
        closePanel();
      }

      setSuccess("Le document a été supprimé.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer ce document.",
      );
    } finally {
      setPendingDocumentId(null);
    }
  }

  async function handleToggleActive(
    document: KnowledgeDocument,
  ) {
    clearMessages();
    setPendingDocumentId(document.id);

    try {
      const updated = await updateKnowledgeDocument(
        document.id,
        { isActive: !document.isActive },
      );

      setDocuments((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Impossible de modifier le statut.",
      );
    } finally {
      setPendingDocumentId(null);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <section className="knowledge-page">
      <header className="knowledge-header">
        <div>
          <span className="knowledge-eyebrow">
            Mémoire de l’agent
          </span>
          <h1>Connaissances</h1>
          <p>
            Gérez les informations utilisées par AllenVoice pour
            répondre à vos clients.
          </p>
        </div>

        <div className="knowledge-header-meta">
          <span>
            <strong>{readyCount}</strong> prêts
          </span>
          <span aria-hidden="true" className="knowledge-meta-divider" />
          <span>
            <strong>{documents.length}</strong> documents
          </span>
        </div>
      </header>

      {error && (
        <div className="knowledge-alert knowledge-alert--error" role="alert">
          <KnowledgeIcon
            className="knowledge-alert-icon"
            name="warning"
          />
          <span>{error}</span>
          <button
            aria-label="Fermer le message"
            onClick={() => setError(null)}
            type="button"
          >
            <KnowledgeIcon
              className="knowledge-alert-close-icon"
              name="close"
            />
          </button>
        </div>
      )}

      {success && (
        <div
          className="knowledge-alert knowledge-alert--success"
          role="status"
        >
          <KnowledgeIcon
            className="knowledge-alert-icon"
            name="check"
          />
          <span>{success}</span>
          <button
            aria-label="Fermer le message"
            onClick={() => setSuccess(null)}
            type="button"
          >
            <KnowledgeIcon
              className="knowledge-alert-close-icon"
              name="close"
            />
          </button>
        </div>
      )}

      <div className="knowledge-toolbar">
        <label className="knowledge-search">
          <KnowledgeIcon
            className="knowledge-search-icon"
            name="search"
          />
          <span className="knowledge-sr-only">
            Rechercher une connaissance
          </span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une connaissance..."
            type="search"
            value={search}
          />
        </label>

        <label className="knowledge-filter">
          <KnowledgeIcon
            className="knowledge-filter-icon"
            name="filter"
          />
          <span className="knowledge-sr-only">
            Filtrer par catégorie
          </span>
          <select
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            value={categoryFilter}
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map((categoryName) => (
              <option key={categoryName} value={categoryName}>
                {categoryName}
              </option>
            ))}
          </select>
        </label>

        <button
          aria-label="Actualiser les documents"
          className="knowledge-icon-button knowledge-refresh-button"
          disabled={isRefreshing}
          onClick={() => void loadKnowledge()}
          title="Actualiser"
          type="button"
        >
          <KnowledgeIcon
            className={`knowledge-action-icon${
              isRefreshing ? " knowledge-action-icon--spinning" : ""
            }`}
            name="refresh"
          />
        </button>

        <button
          className="knowledge-primary-button"
          onClick={() => openCreatePanel("manual")}
          type="button"
        >
          <KnowledgeIcon
            className="knowledge-action-icon"
            name="plus"
          />
          Ajouter une connaissance
        </button>
      </div>

      <div className="knowledge-table-card">
        <div className="knowledge-table-head">
          <span>Connaissance</span>
          <span>Catégorie</span>
          <span>Statut</span>
          <span>Mise à jour</span>
          <span>Actif</span>
          <span>Actions</span>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="knowledge-empty-state">
            <span className="knowledge-empty-icon">
              <KnowledgeIcon
                className="knowledge-empty-icon-svg"
                name="document"
              />
            </span>
            <h2>
              {documents.length === 0
                ? "Aucune connaissance pour le moment"
                : "Aucun résultat"}
            </h2>
            <p>
              {documents.length === 0
                ? "Ajoutez une information ou importez un document pour commencer."
                : "Essayez une autre recherche ou une autre catégorie."}
            </p>
            {documents.length === 0 && (
              <button
                className="knowledge-secondary-button"
                onClick={() => openCreatePanel("manual")}
                type="button"
              >
                Ajouter la première connaissance
              </button>
            )}
          </div>
        ) : (
          <div className="knowledge-table-body">
            {filteredDocuments.map((document) => {
              const isManual =
                document.sourceType === "TEXT" ||
                document.sourceType === "FAQ";
              const isPending =
                pendingDocumentId === document.id;
              const canActivate = document.status === "READY";

              return (
                <article
                  className="knowledge-row"
                  key={document.id}
                >
                  <div className="knowledge-document-cell">
                    <span
                      className={`knowledge-file-icon knowledge-file-icon--${document.sourceType.toLowerCase()}`}
                    >
                      <KnowledgeIcon
                        className="knowledge-file-icon-svg"
                        name={document.fileName ? "file" : "document"}
                      />
                    </span>
                    <div>
                      <strong>{document.title}</strong>
                      <span>
                        {getSourceTypeLabel(document.sourceType)}
                        {document.fileSize !== null
                          ? ` · ${formatFileSize(document.fileSize)}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="knowledge-category-cell">
                    <span className="knowledge-mobile-label">
                      Catégorie
                    </span>
                    <span>{document.category || "Général"}</span>
                  </div>

                  <div className="knowledge-status-cell">
                    <span className="knowledge-mobile-label">
                      Statut
                    </span>
                    <span
                      className={`knowledge-status knowledge-status--${document.status.toLowerCase()}`}
                    >
                      <span className="knowledge-status-dot" />
                      {getStatusLabel(document.status)}
                    </span>
                    {document.failureReason && (
                      <span
                        className="knowledge-failure-reason"
                        title={document.failureReason}
                      >
                        {document.failureReason}
                      </span>
                    )}
                  </div>

                  <div className="knowledge-date-cell">
                    <span className="knowledge-mobile-label">
                      Mise à jour
                    </span>
                    <span>{formatDate(document.updatedAt)}</span>
                    {document._count && (
                      <small>
                        {document._count.chunks} chunk
                        {document._count.chunks > 1 ? "s" : ""}
                      </small>
                    )}
                  </div>

                  <div className="knowledge-active-cell">
                    <span className="knowledge-mobile-label">Actif</span>
                    <button
                      aria-checked={document.isActive}
                      aria-label={`${
                        document.isActive ? "Désactiver" : "Activer"
                      } ${document.title}`}
                      className={`knowledge-switch${
                        document.isActive ? " knowledge-switch--active" : ""
                      }`}
                      disabled={isPending || !canActivate}
                      onClick={() =>
                        void handleToggleActive(document)
                      }
                      role="switch"
                      type="button"
                    >
                      <span />
                    </button>
                  </div>

                  <div className="knowledge-actions-cell">
                    <span className="knowledge-mobile-label">
                      Actions
                    </span>
                    {isManual && (
                      <button
                        aria-label={`Modifier ${document.title}`}
                        className="knowledge-row-action"
                        disabled={isPending}
                        onClick={() => handleEdit(document)}
                        title="Modifier"
                        type="button"
                      >
                        <KnowledgeIcon
                          className="knowledge-row-action-icon"
                          name="edit"
                        />
                      </button>
                    )}
                    <button
                      aria-label={`Supprimer ${document.title}`}
                      className="knowledge-row-action knowledge-row-action--danger"
                      disabled={isPending}
                      onClick={() => void handleDelete(document)}
                      title="Supprimer"
                      type="button"
                    >
                      <KnowledgeIcon
                        className="knowledge-row-action-icon"
                        name="trash"
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="knowledge-footer-note">
        <span>
          Les documents en traitement sont actualisés automatiquement.
        </span>
        <span aria-hidden="true">•</span>
        <span>
          {filteredDocuments.length} affiché
          {filteredDocuments.length > 1 ? "s" : ""}
        </span>
      </div>

      {isPanelOpen && (
        <div
          aria-modal="true"
          className="knowledge-panel-layer"
          role="dialog"
        >
          <button
            aria-label="Fermer le panneau"
            className="knowledge-panel-backdrop"
            onClick={closePanel}
            type="button"
          />

          <aside className="knowledge-panel">
            <header className="knowledge-panel-header">
              <div>
                <span className="knowledge-panel-kicker">
                  {editingId ? "Modification" : "Nouvelle entrée"}
                </span>
                <h2>
                  {editingId
                    ? "Modifier la connaissance"
                    : "Ajouter une connaissance"}
                </h2>
              </div>

              <button
                aria-label="Fermer"
                className="knowledge-panel-close"
                disabled={isSaving || isUploading}
                onClick={closePanel}
                type="button"
              >
                <KnowledgeIcon
                  className="knowledge-panel-close-icon"
                  name="close"
                />
              </button>
            </header>

            {!editingId && (
              <div className="knowledge-panel-tabs">
                <button
                  className={
                    panelMode === "manual"
                      ? "knowledge-panel-tab knowledge-panel-tab--active"
                      : "knowledge-panel-tab"
                  }
                  onClick={() => {
                    clearMessages();
                    setPanelMode("manual");
                  }}
                  type="button"
                >
                  <KnowledgeIcon
                    className="knowledge-tab-icon"
                    name="document"
                  />
                  Information
                </button>

                <button
                  className={
                    panelMode === "upload"
                      ? "knowledge-panel-tab knowledge-panel-tab--active"
                      : "knowledge-panel-tab"
                  }
                  onClick={() => {
                    clearMessages();
                    setPanelMode("upload");
                  }}
                  type="button"
                >
                  <KnowledgeIcon
                    className="knowledge-tab-icon"
                    name="upload"
                  />
                  Importer un fichier
                </button>
              </div>
            )}

            {panelMode === "manual" ? (
              <form
                className="knowledge-panel-form"
                onSubmit={handleSubmit}
              >
                <label className="knowledge-field">
                  <span>Titre</span>
                  <input
                    autoFocus
                    maxLength={160}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex. Conditions de livraison"
                    required
                    type="text"
                    value={title}
                  />
                </label>

                <label className="knowledge-field">
                  <span>Catégorie</span>
                  <input
                    list="knowledge-category-options"
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    placeholder="Ex. FAQ, Tarifs, Support"
                    type="text"
                    value={category}
                  />
                  <datalist id="knowledge-category-options">
                    {categories.map((categoryName) => (
                      <option
                        key={categoryName}
                        value={categoryName}
                      />
                    ))}
                  </datalist>
                </label>

                <label className="knowledge-field knowledge-field--content">
                  <span>Contenu</span>
                  <textarea
                    maxLength={12000}
                    onChange={(event) =>
                      setContent(event.target.value)
                    }
                    placeholder="Rédigez le contenu que l’agent doit connaître..."
                    required
                    rows={9}
                    value={content}
                  />
                  <small>{content.length.toLocaleString("fr-CA")} caractères</small>
                </label>

                {error && (
                  <p className="knowledge-panel-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="knowledge-panel-actions">
                  <button
                    className="knowledge-secondary-button"
                    disabled={isSaving}
                    onClick={closePanel}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="knowledge-primary-button"
                    disabled={isSaving}
                    type="submit"
                  >
                    {isSaving
                      ? "Enregistrement..."
                      : editingId
                        ? "Enregistrer"
                        : "Ajouter"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                className="knowledge-panel-form"
                onSubmit={handleUpload}
              >
                <label className="knowledge-upload-zone">
                  <input
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  <span className="knowledge-upload-icon-wrap">
                    <KnowledgeIcon
                      className="knowledge-upload-icon"
                      name="upload"
                    />
                  </span>
                  <strong>
                    {selectedFile
                      ? selectedFile.name
                      : "Choisir un document"}
                  </strong>
                  <span>
                    {selectedFile
                      ? formatFileSize(selectedFile.size)
                      : "PDF, Word, Excel, PowerPoint, CSV, TXT ou image"}
                  </span>
                </label>

                <label className="knowledge-field">
                  <span>Titre</span>
                  <input
                    onChange={(event) =>
                      setUploadTitle(event.target.value)
                    }
                    placeholder="Nom visible dans AllenVoice"
                    required
                    type="text"
                    value={uploadTitle}
                  />
                </label>

                <label className="knowledge-field">
                  <span>Catégorie</span>
                  <input
                    list="knowledge-upload-category-options"
                    onChange={(event) =>
                      setUploadCategory(event.target.value)
                    }
                    placeholder="Ex. Produits, Tarifs, Procédures"
                    type="text"
                    value={uploadCategory}
                  />
                  <datalist id="knowledge-upload-category-options">
                    {categories.map((categoryName) => (
                      <option
                        key={categoryName}
                        value={categoryName}
                      />
                    ))}
                  </datalist>
                </label>

                <label className="knowledge-field">
                  <span>Audience</span>
                  <select
                    onChange={(event) =>
                      setUploadAudience(
                        event.target.value as KnowledgeAudience,
                      )
                    }
                    value={uploadAudience}
                  >
                    <option value="CUSTOMER">Clients</option>
                    <option value="INTERNAL">Interne</option>
                  </select>
                </label>

                {error && (
                  <p className="knowledge-panel-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="knowledge-panel-actions">
                  <button
                    className="knowledge-secondary-button"
                    disabled={isUploading}
                    onClick={closePanel}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="knowledge-primary-button"
                    disabled={isUploading || !selectedFile}
                    type="submit"
                  >
                    {isUploading
                      ? "Importation..."
                      : "Importer le document"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
