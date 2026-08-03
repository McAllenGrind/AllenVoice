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

export default function CallDetailPage() {
  const { id } = useParams();

  const [call, setCall] =
    useState<VoiceCallDetail | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCall() {
      if (!id) {
        setError(
          "Identifiant d'appel invalide.",
        );

        setIsLoading(false);

        return;
      }

      try {
        const data =
          await getVoiceCall(id);

        setCall(data);
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

    void loadCall();
  }, [id]);

  if (isLoading) {
    return (
      <p>
        Chargement de l'appel...
      </p>
    );
  }

  if (error || !call) {
    return (
      <section>
        <Link to="/calls">
          ← Retour aux appels
        </Link>

        <p role="alert">
          {error ?? "Appel introuvable."}
        </p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/calls">
        ← Retour aux appels
      </Link>

      <h1>Détail de l'appel</h1>

      <div>
        <p>
          <strong>Client :</strong>{" "}
          {call.fromNumber ??
            "Numéro inconnu"}
        </p>

        <p>
          <strong>Date :</strong>{" "}
          {new Date(
            call.startedAt,
          ).toLocaleString("fr-CA")}
        </p>

        <p>
          <strong>Statut :</strong>{" "}
          {call.status}
        </p>

        <p>
          <strong>Durée :</strong>{" "}
          {call.durationSeconds !== null
            ? `${call.durationSeconds} secondes`
            : "—"}
        </p>
      </div>

      <hr />

      <h2>Conversation</h2>

      {call.messages.length === 0 ? (
        <p>
          Aucun message enregistré.
        </p>
      ) : (
        <div>
          {call.messages.map(
            (message) => (
              <div key={message.id}>
                <p>
                  <strong>
                    {message.role ===
                    "CUSTOMER"
                      ? "Client"
                      : "AllenVoice"}
                  </strong>
                </p>

                <p>
                  {message.text}
                </p>

                <small>
                  {new Date(
                    message.createdAt,
                  ).toLocaleTimeString(
                    "fr-CA",
                  )}
                </small>

                <hr />
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}