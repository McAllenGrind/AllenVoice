import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router";

import {
  getKnowledgeDocuments,
  getVoiceCalls,
  type KnowledgeDocument,
  type VoiceCall,
} from "../api/api";

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatStatus(
  status: VoiceCall["status"],
): string {
  switch (status) {
    case "COMPLETED":
      return "Terminé";

    case "IN_PROGRESS":
      return "En cours";

    case "FAILED":
      return "Échoué";

    default:
      return status;
  }
}

export default function DashboardPage() {
  const [calls, setCalls] =
    useState<VoiceCall[]>([]);

  const [documents, setDocuments] =
    useState<KnowledgeDocument[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          callsData,
          knowledgeData,
        ] = await Promise.all([
          getVoiceCalls(),
          getKnowledgeDocuments(),
        ]);

        setCalls(callsData);
        setDocuments(knowledgeData);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Impossible de charger le dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <p>
        Chargement du dashboard...
      </p>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Dashboard</h1>

        <p role="alert">
          {error}
        </p>
      </section>
    );
  }

  const callsToday =
    calls.filter((call) =>
      isToday(call.startedAt),
    ).length;

  const completedCallsToday =
  calls.filter(
    (call) =>
      isToday(call.startedAt) &&
      call.status === "COMPLETED",
  ).length;

  const activeDocuments =
    documents.filter(
      (document) =>
        document.isActive,
    ).length;

  const recentCalls =
    calls.slice(0, 5);

    const durationsToday = calls
  .filter((call) =>
    isToday(call.startedAt),
  )
  .map((call) => call.durationSeconds)
  .filter(
    (duration): duration is number =>
      duration !== null,
  );

const averageDurationToday =
  durationsToday.length > 0
    ? Math.round(
        durationsToday.reduce(
          (total, duration) =>
            total + duration,
          0,
        ) / durationsToday.length,
      )
    : 0;

  return (
    <section>
      <h1>Dashboard</h1>

      <p>
        Vue d'ensemble de votre agent AllenVoice.
      </p>

      <hr />

      <section>
        <h2>Activité</h2>

        <div>
          <article>
            <h3>
              Appels aujourd'hui
            </h3>

            <p>{callsToday}</p>
          </article>

          <article>
            <h3>
                Appels terminés aujourd'hui
            </h3>

            <p>{completedCallsToday}</p>
          </article>

          <article>
            <h3>   
                Durée moyenne aujourd'hui
            </h3>

            <p>{averageDurationToday} s</p>
          </article>

          <article>
            <h3>
              Connaissances actives
            </h3>

            <p>{activeDocuments}</p>
          </article>
        </div>
      </section>

      <hr />

      <section>
        <h2>Appels récents</h2>

        {recentCalls.length === 0 ? (
          <p>
            Aucun appel enregistré.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Statut</th>
                <th>Durée</th>
                <th>Détails</th>
              </tr>
            </thead>

            <tbody>
              {recentCalls.map(
                (call) => (
                  <tr key={call.id}>
                    <td>
                      {new Date(
                        call.startedAt,
                      ).toLocaleString(
                        "fr-CA",
                      )}
                    </td>

                    <td>
                      {call.fromNumber ??
                        "Numéro inconnu"}
                    </td>

                    <td>
                      {formatStatus(
                        call.status,
                      )}
                    </td>

                    <td>
                      {call.durationSeconds !==
                      null
                        ? `${call.durationSeconds} s`
                        : "—"}
                    </td>

                    <td>
                      <Link
                        to={`/calls/${call.id}`}
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        <p>
          <Link to="/calls">
            Voir tous les appels
          </Link>
        </p>
      </section>
    </section>
  );
}