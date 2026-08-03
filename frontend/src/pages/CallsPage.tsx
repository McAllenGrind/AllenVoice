import {
  useEffect,
  useState,
} from "react";

import {
  getVoiceCalls,
  type VoiceCall,
} from "../api/api";

import { Link } from "react-router";

export default function CallsPage() {
  const [calls, setCalls] =
    useState<VoiceCall[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCalls() {
      try {
        const data =
          await getVoiceCalls();

        setCalls(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCalls();
  }, []);

  if (isLoading) {
    return (
      <p>
        Chargement des appels...
      </p>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Appels</h1>

        <p role="alert">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Appels</h1>

      <p>
        Historique des appels de votre agent AllenVoice.
      </p>

      {calls.length === 0 ? (
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
              <th>Messages</th>
              <th>Détails</th>
            </tr>
          </thead>

          <tbody>
            {calls.map((call) => (
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
                  {call.status}
                </td>

                <td>
                  {call.durationSeconds !==
                  null
                    ? `${call.durationSeconds} s`
                    : "—"}
                </td>

                <td>
                  {call._count.messages}
                </td>

                <td>
                    <Link to={`/calls/${call.id}`}>
                        Voir
                    </Link>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}