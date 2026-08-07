import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  getVoiceCall,
  type VoiceCallDetail,
} from "../api/api";

import "./CallDetailPage.css";

function formatDateTime(
  dateString: string,
): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "long",
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
  status: VoiceCallDetail["status"],
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
  status: VoiceCallDetail["status"],
): string {
  return status
    .toLowerCase()
    .replaceAll("_", "-");
}

export default function CallDetailPage() {
  const { id } = useParams();

  const [call, setCall] =
    useState<VoiceCallDetail | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadCall() {
      if (!id) {
        setError(
          "Identifiant d'appel invalide.",
        );
        setIsLoading(false);
        return;
      }

      try {
        const data = await getVoiceCall(id);

        if (!isCancelled) {
          setCall(data);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Impossible de charger cet appel.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCall();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        className="call-detail-page call-detail-page--loading"
      >
        <div className="call-detail-skeleton call-detail-skeleton--back" />
        <div className="call-detail-skeleton call-detail-skeleton--title" />
        <div className="call-detail-skeleton call-detail-skeleton--summary" />
        <div className="call-detail-skeleton call-detail-skeleton--conversation" />
      </section>
    );
  }

  if (error || !call) {
    return (
      <section className="call-detail-page">
        <Link
          className="call-detail-back-link"
          to="/calls"
        >
          <span aria-hidden="true">←</span>
          Retour à l'historique
        </Link>

        <div
          className="call-detail-error-card"
          role="alert"
        >
          <h1>Appel introuvable</h1>
          <p>
            {error ??
              "Impossible d'afficher cet appel."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="call-detail-page">
      <Link
        className="call-detail-back-link"
        to="/calls"
      >
        <span aria-hidden="true">←</span>
        Retour à l'historique
      </Link>

      <header className="call-detail-page-header">
        <div>
          <p className="call-detail-eyebrow">
            Détail de l'appel
          </p>
          <h1>
            {call.fromNumber ??
              "Numéro inconnu"}
          </h1>
          <p>
            {formatDateTime(call.startedAt)}
          </p>
        </div>

        <span
          className={`call-detail-status call-detail-status--${getStatusClassName(
            call.status,
          )}`}
        >
          {getStatusLabel(call.status)}
        </span>
      </header>

      <div className="call-detail-summary-card">
        <div>
          <span>Contact</span>
          <strong>
            {call.fromNumber ??
              "Numéro inconnu"}
          </strong>
        </div>
        <div>
          <span>Date et heure</span>
          <strong>
            {formatDateTime(call.startedAt)}
          </strong>
        </div>
        <div>
          <span>Durée</span>
          <strong>
            {formatDuration(
              call.durationSeconds,
            )}
          </strong>
        </div>
        <div>
          <span>Messages</span>
          <strong>{call.messages.length}</strong>
        </div>
      </div>

      <div className="call-detail-conversation-card">
        <div className="call-detail-conversation-header">
          <div>
            <h2>Conversation</h2>
            <p>
              Transcription enregistrée pendant l'appel.
            </p>
          </div>
        </div>

        {call.messages.length === 0 ? (
          <div className="call-detail-empty">
            <strong>
              Aucun message enregistré
            </strong>
            <p>
              La conversation n'est pas disponible pour cet appel.
            </p>
          </div>
        ) : (
          <div className="call-detail-transcript">
            {call.messages.map((message) => {
              const isCustomer =
                message.role === "CUSTOMER";

              return (
                <article
                  className={`call-detail-message call-detail-message--${
                    isCustomer
                      ? "customer"
                      : "agent"
                  }`}
                  key={message.id}
                >
                  <div className="call-detail-message-meta">
                    <strong>
                      {isCustomer
                        ? "Client"
                        : "Agent"}
                    </strong>
                    <time
                      dateTime={message.createdAt}
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
          </div>
        )}
      </div>
    </section>
  );
}
