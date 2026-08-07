import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import {
  getVoiceCall,
  getVoiceCalls,
  type VoiceCall,
  type VoiceCallDetail,
} from "../api/api";

import "./CallsPage.css";

type PeriodFilter =
  | "ALL"
  | "7"
  | "30"
  | "90";

type CallsIconName =
  | "call"
  | "clock"
  | "message"
  | "refresh"
  | "search"
  | "warning";

function CallsIcon({
  name,
  className = "",
}: {
  name: CallsIconName;
  className?: string;
}) {
  const commonProps = {
    "aria-hidden": true,
    className,
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "call":
      return (
        <svg {...commonProps}>
          <path d="M7.4 3.5 10 8l-2.2 2.2a15.2 15.2 0 0 0 6 6L16 14l4.5 2.6-.9 3.1a2 2 0 0 1-2 1.4C9.5 20.5 3.5 14.5 2.9 6.4a2 2 0 0 1 1.4-2l3.1-.9Z" />
        </svg>
      );

    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "message":
      return (
        <svg {...commonProps}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
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

function formatDateTime(
  dateString: string,
): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDuration(
  totalSeconds: number | null,
): string {
  if (totalSeconds === null) {
    return "—";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds} s`;
  }

  const minutes = Math.floor(
    totalSeconds / 60,
  );
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes} min ${seconds
      .toString()
      .padStart(2, "0")} s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} h ${remainingMinutes
    .toString()
    .padStart(2, "0")} min`;
}

function getStatusLabel(
  status: VoiceCall["status"],
): string {
  switch (status) {
    case "COMPLETED":
      return "Traité";

    case "IN_PROGRESS":
      return "En cours";

    case "FAILED":
      return "Échec";
  }
}

function getStatusClassName(
  status: VoiceCall["status"],
): string {
  return status
    .toLowerCase()
    .replaceAll("_", "-");
}

function LoadingCallsPage() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de l'historique des appels"
      className="calls-page calls-page--loading"
    >
      <div className="calls-skeleton calls-skeleton--title" />
      <div className="calls-skeleton calls-skeleton--subtitle" />
      <div className="calls-skeleton calls-skeleton--filters" />
      <div className="calls-content-grid">
        <div className="calls-skeleton calls-skeleton--list" />
        <div className="calls-skeleton calls-skeleton--detail" />
      </div>
    </section>
  );
}

export default function CallsPage() {
  const [calls, setCalls] =
    useState<VoiceCall[]>([]);
  const [selectedCallId, setSelectedCallId] =
    useState<string | null>(null);
  const [selectedCall, setSelectedCall] =
    useState<VoiceCallDetail | null>(null);

  const [search, setSearch] = useState("");
  const [period, setPeriod] =
    useState<PeriodFilter>("ALL");

  const [isLoading, setIsLoading] =
    useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [isLoadingDetail, setIsLoadingDetail] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);
  const [detailError, setDetailError] =
    useState<string | null>(null);

  const loadCalls = useCallback(
    async (showPageLoader = false) => {
      if (showPageLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const data = await getVoiceCalls();
        setCalls(data);

        setSelectedCallId((currentId) => {
          if (
            currentId &&
            data.some(
              (call) => call.id === currentId,
            )
          ) {
            return currentId;
          }

          return data[0]?.id ?? null;
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger les appels.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCalls(true);
  }, [loadCalls]);

  useEffect(() => {
    if (!selectedCallId) {
      setSelectedCall(null);
      setDetailError(null);
      return;
    }

    const callId = selectedCallId;
    let isCancelled = false;

    async function loadSelectedCall() {
      setIsLoadingDetail(true);
      setDetailError(null);

      try {
        const data = await getVoiceCall(callId);

        if (!isCancelled) {
          setSelectedCall(data);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setSelectedCall(null);
          setDetailError(
            caughtError instanceof Error
              ? caughtError.message
              : "Impossible de charger cet appel.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadSelectedCall();

    return () => {
      isCancelled = true;
    };
  }, [selectedCallId]);

  const hasCallInProgress = calls.some(
    (call) => call.status === "IN_PROGRESS",
  );

  useEffect(() => {
    if (!hasCallInProgress) {
      return;
    }

    const intervalId = window.setInterval(
      () => {
        void loadCalls();
      },
      5000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasCallInProgress, loadCalls]);

  const filteredCalls = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    const now = new Date();
    const periodDays =
      period === "ALL"
        ? null
        : Number(period);

    return calls.filter((call) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (call.fromNumber ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (periodDays === null) {
        return true;
      }

      const threshold = new Date(now);
      threshold.setDate(
        threshold.getDate() - periodDays,
      );

      return (
        new Date(call.startedAt) >= threshold
      );
    });
  }, [calls, period, search]);

  useEffect(() => {
    if (filteredCalls.length === 0) {
      return;
    }

    if (
      !filteredCalls.some(
        (call) => call.id === selectedCallId,
      )
    ) {
      setSelectedCallId(filteredCalls[0].id);
    }
  }, [filteredCalls, selectedCallId]);

  if (isLoading) {
    return <LoadingCallsPage />;
  }

  return (
    <section className="calls-page">
      <header className="calls-page-header">
        <div>
          <p className="calls-page-eyebrow">
            Activité de l'agent
          </p>
          <h1>Historique des appels</h1>
          <p className="calls-page-subtitle">
            Retrouvez les appels pris en charge par votre agent.
          </p>
        </div>

        <button
          className="calls-refresh-button"
          disabled={isRefreshing}
          onClick={() => void loadCalls()}
          type="button"
        >
          <CallsIcon
            className={
              isRefreshing
                ? "calls-button-icon calls-button-icon--spinning"
                : "calls-button-icon"
            }
            name="refresh"
          />
          <span>
            {isRefreshing
              ? "Actualisation..."
              : "Actualiser"}
          </span>
        </button>
      </header>

      {error ? (
        <div
          className="calls-alert calls-alert--error"
          role="alert"
        >
          <CallsIcon
            className="calls-alert-icon"
            name="warning"
          />
          <div>
            <strong>
              Impossible de charger l'historique
            </strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="calls-filter-card">
        <label className="calls-search-field">
          <span className="sr-only">
            Rechercher par numéro
          </span>
          <CallsIcon
            className="calls-search-icon"
            name="search"
          />
          <input
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Rechercher par numéro"
            type="search"
            value={search}
          />
        </label>

        <label className="calls-period-field">
          <span>Période</span>
          <select
            onChange={(event) =>
              setPeriod(
                event.target.value as PeriodFilter,
              )
            }
            value={period}
          >
            <option value="ALL">
              Tous les appels
            </option>
            <option value="7">
              7 derniers jours
            </option>
            <option value="30">
              30 derniers jours
            </option>
            <option value="90">
              90 derniers jours
            </option>
          </select>
        </label>

        <div className="calls-filter-count">
          <strong>{filteredCalls.length}</strong>
          <span>
            {filteredCalls.length > 1
              ? "appels affichés"
              : "appel affiché"}
          </span>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="calls-empty-state">
          <div className="calls-empty-icon">
            <CallsIcon
              className="calls-empty-icon-svg"
              name="call"
            />
          </div>
          <h2>Aucun appel enregistré</h2>
          <p>
            Les appels pris en charge par AllenVoice apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="calls-content-grid">
          <div className="calls-list-card">
            <div className="calls-list-header">
              <div>
                <h2>Appels</h2>
                <p>
                  Sélectionnez un appel, puis ouvrez son détail complet.
                </p>
              </div>
            </div>

            {filteredCalls.length === 0 ? (
              <div className="calls-no-results">
                <CallsIcon
                  className="calls-no-results-icon"
                  name="search"
                />
                <strong>
                  Aucun résultat
                </strong>
                <p>
                  Modifiez votre recherche ou la période sélectionnée.
                </p>
              </div>
            ) : (
              <div className="calls-list-table">
                <div
                  aria-hidden="true"
                  className="calls-list-columns"
                >
                  <span>Numéro</span>
                  <span>Date et heure</span>
                  <span>Durée</span>
                  <span>Résultat</span>
                  <span>Messages</span>
                </div>

                <div className="calls-list-body">
                  {filteredCalls.map((call) => {
                    const isSelected =
                      call.id === selectedCallId;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`calls-list-row${
                          isSelected
                            ? " calls-list-row--selected"
                            : ""
                        }`}
                        key={call.id}
                        onClick={() =>
                          setSelectedCallId(
                            call.id,
                          )
                        }
                        type="button"
                      >
                        <span className="calls-phone-cell">
                          <span className="calls-phone-icon">
                            <CallsIcon
                              className="calls-phone-icon-svg"
                              name="call"
                            />
                          </span>
                          <strong>
                            {call.fromNumber ??
                              "Numéro inconnu"}
                          </strong>
                        </span>

                        <span className="calls-date-cell">
                          {formatDateTime(
                            call.startedAt,
                          )}
                        </span>

                        <span className="calls-duration-cell">
                          <CallsIcon
                            className="calls-row-meta-icon"
                            name="clock"
                          />
                          {formatDuration(
                            call.durationSeconds,
                          )}
                        </span>

                        <span>
                          <span
                            className={`calls-status-badge calls-status-badge--${getStatusClassName(
                              call.status,
                            )}`}
                          >
                            {getStatusLabel(
                              call.status,
                            )}
                          </span>
                        </span>

                        <span className="calls-message-count">
                          <CallsIcon
                            className="calls-row-meta-icon"
                            name="message"
                          />
                          {call._count.messages}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="calls-detail-card">
            {!selectedCallId ? (
              <div className="calls-detail-placeholder">
                <div className="calls-detail-placeholder-icon">
                  <CallsIcon
                    className="calls-detail-placeholder-icon-svg"
                    name="call"
                  />
                </div>
                <h2>Aperçu de l'appel</h2>
                <p>
                  Sélectionnez un appel dans la liste.
                </p>
              </div>
            ) : isLoadingDetail ? (
              <div
                aria-busy="true"
                className="calls-detail-loading"
              >
                <div className="calls-skeleton calls-skeleton--detail-title" />
                <div className="calls-skeleton calls-skeleton--detail-line" />
                <div className="calls-skeleton calls-skeleton--detail-meta" />
                <div className="calls-skeleton calls-skeleton--conversation" />
              </div>
            ) : detailError || !selectedCall ? (
              <div
                className="calls-detail-error"
                role="alert"
              >
                <CallsIcon
                  className="calls-detail-error-icon"
                  name="warning"
                />
                <h2>
                  Impossible d'afficher l'appel
                </h2>
                <p>
                  {detailError ??
                    "Appel introuvable."}
                </p>
              </div>
            ) : (
              <div className="calls-detail-content">
                <header className="calls-detail-header">
                  <div>
                    <p className="calls-detail-label">
                      Aperçu de l'appel
                    </p>
                    <h2>
                      {selectedCall.fromNumber ??
                        "Numéro inconnu"}
                    </h2>
                    <p>
                      {formatDateTime(
                        selectedCall.startedAt,
                      )}
                    </p>
                  </div>

                  <div className="calls-detail-header-actions">
                    <span
                      className={`calls-status-badge calls-status-badge--${getStatusClassName(
                        selectedCall.status,
                      )}`}
                    >
                      {getStatusLabel(
                        selectedCall.status,
                      )}
                    </span>

                    <Link
                      className="calls-detail-open-link"
                      to={`/calls/${selectedCall.id}`}
                    >
                      <span>Voir le détail</span>
                      <span
                        aria-hidden="true"
                        className="calls-detail-open-arrow"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                </header>

                <div className="calls-detail-meta-grid">
                  <div>
                    <span>Durée</span>
                    <strong>
                      {formatDuration(
                        selectedCall.durationSeconds,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Messages</span>
                    <strong>
                      {selectedCall.messages.length}
                    </strong>
                  </div>
                </div>

                <div className="calls-conversation-heading">
                  <div>
                    <h3>Aperçu de la conversation</h3>
                    <p>
                      Quelques messages pour identifier rapidement l’échange.
                    </p>
                  </div>
                </div>

                {selectedCall.messages.length ===
                0 ? (
                  <div className="calls-conversation-empty">
                    <CallsIcon
                      className="calls-conversation-empty-icon"
                      name="message"
                    />
                    <strong>
                      Aucun message enregistré
                    </strong>
                    <p>
                      La conversation n'est pas disponible pour cet appel.
                    </p>
                  </div>
                ) : (
                  <div className="calls-transcript">
                    {selectedCall.messages
                      .slice(0, 3)
                      .map((message) => {
                        const isCustomer =
                          message.role ===
                          "CUSTOMER";

                        return (
                          <article
                            className={`calls-message calls-message--${
                              isCustomer
                                ? "customer"
                                : "agent"
                            }`}
                            key={message.id}
                          >
                            <div className="calls-message-meta">
                              <strong>
                                {isCustomer
                                  ? "Client"
                                  : "Agent"}
                              </strong>
                              <time
                                dateTime={
                                  message.createdAt
                                }
                              >
                                {formatTime(
                                  message.createdAt,
                                )}
                              </time>
                            </div>
                            <p>{message.text}</p>
                          </article>
                        );
                      })}

                    {selectedCall.messages.length > 3 ? (
                      <p className="calls-transcript-more">
                        + {selectedCall.messages.length - 3} autre{selectedCall.messages.length - 3 > 1 ? "s" : ""} message{selectedCall.messages.length - 3 > 1 ? "s" : ""} dans le détail complet
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
