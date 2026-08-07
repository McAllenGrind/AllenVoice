import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import {
  getAgentConfiguration,
  getCurrentUser,
  getKnowledgeDocuments,
  getVoiceCalls,
  type AgentConfiguration,
  type CurrentUser,
  type KnowledgeDocument,
  type VoiceCall,
} from "../api/api";

import "./DashboardPage.css";

type DashboardIconName =
  | "agent"
  | "book"
  | "calendar"
  | "calls"
  | "check"
  | "chevron"
  | "clock"
  | "document"
  | "refresh"
  | "warning";

interface DashboardData {
  user: CurrentUser;
  agent: AgentConfiguration;
  calls: VoiceCall[];
  documents: KnowledgeDocument[];
}

interface DashboardIconProps {
  name: DashboardIconName;
  className?: string;
}

function DashboardIcon({
  name,
  className = "",
}: DashboardIconProps) {
  const commonProps = {
    "aria-hidden": true,
    className,
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "agent":
      return (
        <svg {...commonProps}>
          <path d="M12 3v3" />
          <rect
            height="12"
            rx="3"
            width="16"
            x="4"
            y="7"
          />
          <path d="M8 12h.01" />
          <path d="M16 12h.01" />
          <path d="M9 16h6" />
        </svg>
      );

    case "book":
      return (
        <svg {...commonProps}>
          <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z" />
          <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20" />
          <path d="M9 7h7" />
          <path d="M9 11h5" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect
            height="17"
            rx="2.5"
            width="18"
            x="3"
            y="4"
          />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M3 9h18" />
        </svg>
      );

    case "calls":
      return (
        <svg {...commonProps}>
          <path d="M7.4 3.5 10 8l-2.2 2.2a15.2 15.2 0 0 0 6 6L16 14l4.5 2.6-.9 3.1a2 2 0 0 1-2 1.4C9.5 20.5 3.5 14.5 2.9 6.4a2 2 0 0 1 1.4-2l3.1-.9Z" />
        </svg>
      );

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

    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "document":
      return (
        <svg {...commonProps}>
          <path d="M6 2h8l4 4v16H6V2Z" />
          <path d="M14 2v5h5" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M20 6v5h-5" />
          <path d="M18.2 16a8 8 0 1 1 .8-8.9L20 11" />
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

function AgentWave() {
  const bars = [
    11, 18, 8, 25, 15, 31, 20, 38, 27, 43, 34, 47,
    29, 41, 23, 35, 18, 28, 13, 22, 9, 17, 7, 12,
  ];

  return (
    <svg
      aria-hidden="true"
      className="dashboard-agent-wave"
      preserveAspectRatio="none"
      viewBox="0 0 300 96"
    >
      <defs>
        <linearGradient
          id="dashboard-wave-gradient"
          x1="0"
          x2="1"
          y1="0"
          y2="0"
        >
          <stop
            offset="0"
            stopColor="rgba(255,255,255,0.18)"
          />
          <stop
            offset="1"
            stopColor="rgba(255,255,255,0.92)"
          />
        </linearGradient>
      </defs>

      {bars.map((height, index) => {
        const x = 7 + index * 12;
        const y = 48 - height / 2;

        return (
          <rect
            height={height}
            key={`${x}-${height}`}
            rx="2"
            width="4"
            x={x}
            y={y}
          />
        );
      })}
    </svg>
  );
}

function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
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

  if (totalSeconds <= 0) {
    return "0 s";
  }

  const hours = Math.floor(
    totalSeconds / 3600,
  );
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${minutes
      .toString()
      .padStart(2, "0")} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds
      .toString()
      .padStart(2, "0")} s`;
  }

  return `${seconds} s`;
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

function getVoiceLabel(voice: string): string {
  switch (voice) {
    case "ALLEN_1":
      return "Voix 01";

    case "ALLEN_2":
      return "Voix 02";

    case "ALLEN_3":
      return "Voix 03";

    default:
      return "Voix AllenVoice";
  }
}

function getCallStatusLabel(
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

function getCallStatusClassName(
  status: VoiceCall["status"],
): string {
  return status.toLowerCase().replace("_", "-");
}

function LoadingDashboard() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
      className="dashboard-page dashboard-page--loading"
    >
      <div className="dashboard-skeleton dashboard-skeleton--title" />
      <div className="dashboard-skeleton dashboard-skeleton--subtitle" />
      <div className="dashboard-skeleton dashboard-skeleton--hero" />
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton dashboard-skeleton--card" />
        <div className="dashboard-skeleton dashboard-skeleton--card" />
        <div className="dashboard-skeleton dashboard-skeleton--card" />
      </div>
      <div className="dashboard-skeleton dashboard-skeleton--table" />
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(
    async (showPageLoader = false) => {
      if (showPageLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const [
          user,
          agent,
          calls,
          documents,
        ] = await Promise.all([
          getCurrentUser(),
          getAgentConfiguration(),
          getVoiceCalls(),
          getKnowledgeDocuments(),
        ]);

        setData({
          user,
          agent,
          calls,
          documents,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger le tableau de bord.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const hasCallInProgress =
    data?.calls.some(
      (call) =>
        call.status === "IN_PROGRESS",
    ) ?? false;

  useEffect(() => {
    if (!hasCallInProgress) {
      return;
    }

    const intervalId = window.setInterval(
      () => {
        void loadDashboard();
      },
      5000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasCallInProgress, loadDashboard]);

  const metrics = useMemo(() => {
    if (!data) {
      return null;
    }

    const now = new Date();
    const todayStart = getStartOfDay(now);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 6,
    );

    const callsToday = data.calls.filter(
      (call) =>
        isSameDay(
          new Date(call.startedAt),
          now,
        ),
    );

    const callsLastSevenDays =
      data.calls.filter(
        (call) =>
          new Date(call.startedAt) >=
          sevenDaysAgo,
      );

    const totalDurationToday =
      callsToday.reduce(
        (total, call) =>
          total +
          (call.durationSeconds ?? 0),
        0,
      );

    const completedToday =
      callsToday.filter(
        (call) =>
          call.status === "COMPLETED",
      ).length;

    const activeReadyDocuments =
      data.documents.filter(
        (document) =>
          document.isActive &&
          document.status === "READY",
      ).length;

    const readyDocuments =
      data.documents.filter(
        (document) =>
          document.status === "READY",
      ).length;

    const processingDocuments =
      data.documents.filter(
        (document) =>
          document.status ===
          "PROCESSING",
      ).length;

    const failedDocuments =
      data.documents.filter(
        (document) =>
          document.status === "FAILED",
      ).length;

    const totalMessages =
      data.calls.reduce(
        (total, call) =>
          total + call._count.messages,
        0,
      );

    return {
      activeReadyDocuments,
      callsLastSevenDays:
        callsLastSevenDays.length,
      callsToday: callsToday.length,
      completedToday,
      failedDocuments,
      processingDocuments,
      readyDocuments,
      totalDurationToday,
      totalMessages,
    };
  }, [data]);

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (!data || !metrics) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-error-card">
          <DashboardIcon
            className="dashboard-error-icon"
            name="warning"
          />

          <div>
            <h1>Tableau de bord indisponible</h1>
            <p>
              {error ??
                "Les données du tableau de bord n’ont pas pu être chargées."}
            </p>
          </div>

          <button
            className="dashboard-button dashboard-button--primary"
            onClick={() =>
              void loadDashboard(true)
            }
            type="button"
          >
            Réessayer
          </button>
        </div>
      </section>
    );
  }

  const recentCalls = data.calls.slice(0, 5);
  const firstName = getFirstName(
    data.user.fullName,
  );

  const attentionMessage =
    metrics.failedDocuments > 0
      ? `${metrics.failedDocuments} connaissance${
          metrics.failedDocuments > 1 ? "s" : ""
        } à vérifier.`
      : metrics.processingDocuments > 0
        ? `${metrics.processingDocuments} document${
            metrics.processingDocuments > 1
              ? "s sont"
              : " est"
          } encore en traitement.`
        : metrics.activeReadyDocuments === 0
          ? "Ajoutez une première connaissance pour préparer votre agent."
          : "Votre agent et sa base de connaissances sont prêts.";

  return (
    <section className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">
            Tableau de bord
          </p>

          <h1>
            Bonjour{firstName ? `, ${firstName}` : ""}
          </h1>

          <p className="dashboard-page-intro">
            Voici l’activité récente de votre agent AllenVoice.
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          disabled={isRefreshing}
          onClick={() =>
            void loadDashboard()
          }
          type="button"
        >
          <DashboardIcon
            className={
              isRefreshing
                ? "dashboard-refresh-icon dashboard-refresh-icon--spinning"
                : "dashboard-refresh-icon"
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

      {error && (
        <p
          className="dashboard-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <article className="dashboard-agent-card">
        <div className="dashboard-agent-card-content">
          <div className="dashboard-agent-card-heading">
            <span className="dashboard-agent-card-icon">
              <DashboardIcon
                className="dashboard-agent-card-icon-svg"
                name="agent"
              />
            </span>

            <span className="dashboard-agent-status">
              <span aria-hidden="true" />
              Prêt
            </span>
          </div>

          <div>
            <p className="dashboard-agent-label">
              Votre agent
            </p>
            <h2>{data.agent.agentName}</h2>
            <p className="dashboard-agent-description">
              {getVoiceLabel(data.agent.voice)} · prêt à répondre aux appels.
            </p>
          </div>

          <Link
            className="dashboard-button dashboard-button--dark"
            to="/agent"
          >
            Configurer l’agent
            <DashboardIcon
              className="dashboard-button-icon"
              name="chevron"
            />
          </Link>
        </div>

        <AgentWave />
      </article>

      <div className="dashboard-kpi-grid">
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon dashboard-kpi-icon--blue">
            <DashboardIcon
              className="dashboard-kpi-icon-svg"
              name="calls"
            />
          </span>

          <div>
            <p className="dashboard-kpi-label">
              Appels aujourd’hui
            </p>
            <p className="dashboard-kpi-value">
              {metrics.callsToday}
            </p>
            <p className="dashboard-kpi-meta">
              {metrics.completedToday} traité{metrics.completedToday !== 1 ? "s" : ""}
            </p>
          </div>
        </article>

        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon dashboard-kpi-icon--violet">
            <DashboardIcon
              className="dashboard-kpi-icon-svg"
              name="book"
            />
          </span>

          <div>
            <p className="dashboard-kpi-label">
              Connaissances actives
            </p>
            <p className="dashboard-kpi-value">
              {metrics.activeReadyDocuments}
            </p>
            <p className="dashboard-kpi-meta">
              {metrics.readyDocuments} prête{metrics.readyDocuments !== 1 ? "s" : ""} au total
            </p>
          </div>
        </article>

        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon dashboard-kpi-icon--cyan">
            <DashboardIcon
              className="dashboard-kpi-icon-svg"
              name="clock"
            />
          </span>

          <div>
            <p className="dashboard-kpi-label">
              Durée prise en charge
            </p>
            <p className="dashboard-kpi-value dashboard-kpi-value--duration">
              {formatDuration(
                metrics.totalDurationToday,
              )}
            </p>
            <p className="dashboard-kpi-meta">
              Aujourd’hui
            </p>
          </div>
        </article>
      </div>

      <div className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-recent-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Appels récents</h2>
              <p>
                Les dernières conversations prises en charge.
              </p>
            </div>

            <Link
              className="dashboard-text-link"
              to="/calls"
            >
              Voir tous les appels
              <DashboardIcon
                className="dashboard-text-link-icon"
                name="chevron"
              />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="dashboard-empty-state">
              <span className="dashboard-empty-state-icon">
                <DashboardIcon
                  className="dashboard-empty-state-icon-svg"
                  name="calls"
                />
              </span>
              <h3>Aucun appel pour le moment</h3>
              <p>
                Les appels traités par votre agent apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="dashboard-call-list">
              {recentCalls.map((call) => (
                <Link
                  className="dashboard-call-row"
                  key={call.id}
                  to={`/calls/${call.id}`}
                >
                  <span className="dashboard-call-icon">
                    <DashboardIcon
                      className="dashboard-call-icon-svg"
                      name="calls"
                    />
                  </span>

                  <span className="dashboard-call-identity">
                    <strong>
                      {call.fromNumber ??
                        "Numéro inconnu"}
                    </strong>
                    <span>
                      {formatDateTime(
                        call.startedAt,
                      )}
                    </span>
                  </span>

                  <span className="dashboard-call-duration">
                    {formatDuration(
                      call.durationSeconds,
                    )}
                  </span>

                  <span
                    className={`dashboard-status-badge dashboard-status-badge--${getCallStatusClassName(
                      call.status,
                    )}`}
                  >
                    {getCallStatusLabel(
                      call.status,
                    )}
                  </span>

                  <DashboardIcon
                    className="dashboard-call-chevron"
                    name="chevron"
                  />
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="dashboard-side-column">
          <article className="dashboard-panel dashboard-actions-panel">
            <div className="dashboard-panel-heading dashboard-panel-heading--compact">
              <div>
                <h2>Actions rapides</h2>
                <p>Accédez aux réglages essentiels.</p>
              </div>
            </div>

            <nav
              aria-label="Actions rapides"
              className="dashboard-action-list"
            >
              <Link
                className="dashboard-action-link"
                to="/agent"
              >
                <span>
                  <DashboardIcon
                    className="dashboard-action-icon"
                    name="agent"
                  />
                </span>
                <strong>Configurer l’agent</strong>
                <DashboardIcon
                  className="dashboard-action-chevron"
                  name="chevron"
                />
              </Link>

              <Link
                className="dashboard-action-link"
                to="/knowledge"
              >
                <span>
                  <DashboardIcon
                    className="dashboard-action-icon"
                    name="document"
                  />
                </span>
                <strong>Ajouter une connaissance</strong>
                <DashboardIcon
                  className="dashboard-action-chevron"
                  name="chevron"
                />
              </Link>

              <Link
                className="dashboard-action-link"
                to="/calls"
              >
                <span>
                  <DashboardIcon
                    className="dashboard-action-icon"
                    name="calendar"
                  />
                </span>
                <strong>Consulter les appels</strong>
                <DashboardIcon
                  className="dashboard-action-chevron"
                  name="chevron"
                />
              </Link>
            </nav>
          </article>

          <article
            className={`dashboard-health-card${
              metrics.failedDocuments > 0
                ? " dashboard-health-card--warning"
                : ""
            }`}
          >
            <div className="dashboard-health-card-header">
              <span className="dashboard-health-icon">
                <DashboardIcon
                  className="dashboard-health-icon-svg"
                  name={
                    metrics.failedDocuments > 0
                      ? "warning"
                      : "check"
                  }
                />
              </span>

              <div>
                <p className="dashboard-health-label">
                  État des connaissances
                </p>
                <h2>{attentionMessage}</h2>
              </div>
            </div>

            <div className="dashboard-health-stats">
              <span>
                <strong>{metrics.readyDocuments}</strong>
                Prêtes
              </span>
              <span>
                <strong>{metrics.processingDocuments}</strong>
                En traitement
              </span>
              <span>
                <strong>{metrics.failedDocuments}</strong>
                À vérifier
              </span>
            </div>

            <Link
              className="dashboard-health-link"
              to="/knowledge"
            >
              Gérer les connaissances
              <DashboardIcon
                className="dashboard-text-link-icon"
                name="chevron"
              />
            </Link>
          </article>
        </aside>
      </div>

      <footer className="dashboard-data-note">
        <span>
          {metrics.callsLastSevenDays} appel{metrics.callsLastSevenDays !== 1 ? "s" : ""} sur les 7 derniers jours
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {metrics.totalMessages} message{metrics.totalMessages !== 1 ? "s" : ""} dans les {data.calls.length} derniers appels chargés
        </span>
        <span aria-hidden="true">·</span>
        <span>Maximum 50 appels</span>
      </footer>
    </section>
  );
}
