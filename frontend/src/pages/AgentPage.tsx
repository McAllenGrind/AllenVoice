import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAgentConfiguration,
  updateAgentConfiguration,
  type AgentConfiguration,
} from "../api/api";

import "./AgentPage.css";

type AgentIconName =
  | "check"
  | "info"
  | "refresh"
  | "sparkles"
  | "warning";

interface AgentIconProps {
  name: AgentIconName;
  className?: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  bars: number[];
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "ALLEN_1",
    name: "Voix 01",
    description: "Chaleureuse et professionnelle",
    bars: [
      10, 18, 13, 25, 17, 32, 22, 38, 20, 29, 16,
      35, 24, 41, 27, 34, 18, 28, 14, 23, 11, 17,
    ],
  },
  {
    id: "ALLEN_2",
    name: "Voix 02",
    description: "Naturelle et dynamique",
    bars: [
      13, 24, 18, 34, 21, 42, 27, 36, 17, 31, 25,
      46, 33, 39, 22, 35, 20, 29, 15, 25, 12, 19,
    ],
  },
  {
    id: "ALLEN_3",
    name: "Voix 03",
    description: "Calme et rassurante",
    bars: [
      8, 14, 11, 20, 15, 27, 19, 31, 23, 35, 21,
      29, 18, 25, 16, 23, 14, 19, 11, 16, 9, 13,
    ],
  },
];

const WELCOME_MESSAGE_LIMIT = 500;

function AgentIcon({
  name,
  className = "",
}: AgentIconProps) {
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

    case "info":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M20 6v5h-5" />
          <path d="M18.2 16a8 8 0 1 1 .8-8.9L20 11" />
        </svg>
      );

    case "sparkles":
      return (
        <svg {...commonProps}>
          <path d="m12 3 1.2 3.1L16 7.5l-2.8 1.4L12 12l-1.2-3.1L8 7.5l2.8-1.4L12 3Z" />
          <path d="m18.5 13 .8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9.8-2.1Z" />
          <path d="m5.5 13 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
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

function VoiceWave({
  bars,
}: {
  bars: number[];
}) {
  return (
    <span
      aria-hidden="true"
      className="agent-voice-wave"
    >
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}


function PreviewRobotIcon() {
  return (
    <svg
      aria-hidden="true"
      className="agent-preview-robot-icon"
      viewBox="0 0 24 24"
    >
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
}

function PreviewWave() {
  const bars = [
    9, 14, 22, 12, 31, 18, 42, 24, 52, 35, 62, 29,
    48, 23, 39, 18, 31, 14, 25, 11, 19, 8, 14, 6,
    11, 5,
  ];

  return (
    <div
      aria-hidden="true"
      className="agent-preview-wave"
    >
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de la configuration de l’agent"
      className="agent-page agent-page--loading"
    >
      <div className="agent-loading-heading" />
      <div className="agent-loading-subheading" />

      <div className="agent-loading-grid">
        <div className="agent-loading-card" />
        <div className="agent-loading-column">
          <div className="agent-loading-card agent-loading-card--voices" />
          <div className="agent-loading-card agent-loading-card--preview" />
        </div>
      </div>
    </section>
  );
}

export default function AgentPage() {
  const [configuration, setConfiguration] =
    useState<AgentConfiguration | null>(null);
  const [agentName, setAgentName] = useState("");
  const [welcomeMessage, setWelcomeMessage] =
    useState("");
  const [voice, setVoice] = useState(
    VOICE_OPTIONS[0].id,
  );
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const applyConfiguration = useCallback(
    (nextConfiguration: AgentConfiguration) => {
      setConfiguration(nextConfiguration);
      setAgentName(nextConfiguration.agentName);
      setWelcomeMessage(
        nextConfiguration.welcomeMessage,
      );
      setVoice(nextConfiguration.voice);
    },
    [],
  );

  const loadConfiguration = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextConfiguration =
          await getAgentConfiguration();

        applyConfiguration(nextConfiguration);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Une erreur est survenue.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applyConfiguration],
  );

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const selectedVoice = useMemo(
    () =>
      VOICE_OPTIONS.find(
        (option) => option.id === voice,
      ) ?? VOICE_OPTIONS[0],
    [voice],
  );

  const hasChanges = useMemo(() => {
    if (!configuration) {
      return false;
    }

    return (
      agentName !== configuration.agentName ||
      welcomeMessage !==
        configuration.welcomeMessage ||
      voice !== configuration.voice
    );
  }, [
    agentName,
    configuration,
    voice,
    welcomeMessage,
  ]);

  function handleFieldChange() {
    setSuccess(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedAgentName = agentName.trim();
    const normalizedWelcomeMessage =
      welcomeMessage.trim();

    if (
      !normalizedAgentName ||
      !normalizedWelcomeMessage
    ) {
      setError(
        "Le nom de l’agent et le message d’accueil sont obligatoires.",
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updated =
        await updateAgentConfiguration({
          agentName: normalizedAgentName,
          welcomeMessage:
            normalizedWelcomeMessage,
          voice,
        });

      applyConfiguration(updated);
      setSuccess(
        "Les modifications de l’agent ont été enregistrées.",
      );
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

  if (isLoading) {
    return <LoadingState />;
  }

  if (!configuration) {
    return (
      <section className="agent-page">
        <header className="agent-page-header">
          <div>
            <span className="agent-eyebrow">
              Configuration vocale
            </span>
            <h1>Agent</h1>
            <p>
              Personnalisez la manière dont votre agent
              accueille vos clients.
            </p>
          </div>
        </header>

        <div className="agent-empty-state">
          <span className="agent-empty-state-icon">
            <AgentIcon
              className="agent-icon"
              name="warning"
            />
          </span>
          <h2>Configuration indisponible</h2>
          <p>
            {error ??
              "Impossible de récupérer les réglages de l’agent."}
          </p>
          <button
            className="agent-secondary-button"
            onClick={() =>
              void loadConfiguration()
            }
            type="button"
          >
            <AgentIcon
              className="agent-button-icon"
              name="refresh"
            />
            Réessayer
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="agent-page">
      <header className="agent-page-header">
        <div>
          <span className="agent-eyebrow">
            Configuration vocale
          </span>
          <h1>Agent</h1>
          <p>
            Personnalisez la manière dont votre agent
            accueille vos clients.
          </p>
        </div>

        <span className="agent-configuration-status">
          <span />
          Configuration active
        </span>
      </header>

      {error && (
        <div
          className="agent-alert agent-alert--error"
          role="alert"
        >
          <AgentIcon
            className="agent-alert-icon"
            name="warning"
          />
          <span>{error}</span>
        </div>
      )}

      <form
        className="agent-form"
        onSubmit={handleSubmit}
      >
        <div className="agent-config-grid">
          <article className="agent-panel agent-information-panel">
            <div className="agent-panel-heading">
              <div>
                <span className="agent-panel-kicker">
                  Identité
                </span>
                <h2>Informations</h2>
              </div>

              <span className="agent-panel-heading-icon">
                <AgentIcon
                  className="agent-icon"
                  name="sparkles"
                />
              </span>
            </div>

            <div className="agent-fields">
              <div className="agent-field">
                <div className="agent-label-row">
                  <label htmlFor="agentName">
                    Nom de l’agent
                  </label>
                  <span>{agentName.length}/50</span>
                </div>

                <input
                  autoComplete="off"
                  id="agentName"
                  maxLength={50}
                  onChange={(
                    event: ChangeEvent<HTMLInputElement>,
                  ) => {
                    setAgentName(event.target.value);
                    handleFieldChange();
                  }}
                  placeholder="Ex. Sophie"
                  required
                  type="text"
                  value={agentName}
                />

                <p className="agent-field-help">
                  Ce nom sera utilisé dans le message
                  d’accueil et dans l’interface.
                </p>
              </div>

              <div className="agent-field agent-field--message">
                <div className="agent-label-row">
                  <label htmlFor="welcomeMessage">
                    Message d’accueil
                  </label>
                  <span>
                    {welcomeMessage.length}/
                    {WELCOME_MESSAGE_LIMIT}
                  </span>
                </div>

                <textarea
                  id="welcomeMessage"
                  maxLength={WELCOME_MESSAGE_LIMIT}
                  onChange={(
                    event: ChangeEvent<HTMLTextAreaElement>,
                  ) => {
                    setWelcomeMessage(
                      event.target.value,
                    );
                    handleFieldChange();
                  }}
                  placeholder="Bonjour, comment puis-je vous aider aujourd’hui ?"
                  required
                  rows={10}
                  value={welcomeMessage}
                />

                <p className="agent-field-help">
                  Il s’agit de la première phrase entendue
                  par le client au début de l’appel.
                </p>
              </div>
            </div>

            <div className="agent-form-actions">
              <button
                className="agent-primary-button"
                disabled={
                  isSaving ||
                  !hasChanges ||
                  !agentName.trim() ||
                  !welcomeMessage.trim()
                }
                type="submit"
              >
                {isSaving
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>

              {success && (
                <div
                  className="agent-success-message"
                  role="status"
                >
                  <span className="agent-success-icon">
                    <AgentIcon
                      className="agent-icon"
                      name="check"
                    />
                  </span>
                  {success}
                </div>
              )}
            </div>
          </article>

          <div className="agent-right-column">
            <article className="agent-panel agent-voice-panel">
              <div className="agent-panel-heading agent-panel-heading--compact">
                <div>
                  <span className="agent-panel-kicker">
                    Expérience client
                  </span>
                  <h2>Choix de la voix</h2>
                </div>
              </div>

              <fieldset className="agent-voice-list">
                <legend className="agent-visually-hidden">
                  Sélectionner une voix
                </legend>

                {VOICE_OPTIONS.map((option) => {
                  const isSelected =
                    option.id === voice;

                  return (
                    <label
                      className={`agent-voice-option${
                        isSelected
                          ? " agent-voice-option--selected"
                          : ""
                      }`}
                      key={option.id}
                    >
                      <input
                        checked={isSelected}
                        name="voice"
                        onChange={() => {
                          setVoice(option.id);
                          handleFieldChange();
                        }}
                        type="radio"
                        value={option.id}
                      />

                      <span className="agent-voice-number">
                        {option.name.replace(
                          "Voix ",
                          "",
                        )}
                      </span>

                      <span className="agent-voice-copy">
                        <strong>{option.name}</strong>
                        <small>
                          {option.description}
                        </small>
                      </span>

                      <VoiceWave bars={option.bars} />

                      <span
                        aria-hidden="true"
                        className="agent-radio-indicator"
                      >
                        <span />
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </article>

            <article className="agent-preview-card">
              <div className="agent-preview-glow" />

              <div className="agent-preview-header">
                <div>
                  <span className="agent-preview-label">
                    Aperçu de l’agent
                  </span>
                  <span
                    aria-label="L’aperçu se met à jour pendant la saisie"
                    className="agent-preview-info"
                    title="L’aperçu se met à jour pendant la saisie."
                  >
                    <AgentIcon
                      className="agent-preview-info-icon"
                      name="info"
                    />
                  </span>
                </div>

                <span className="agent-preview-voice">
                  {selectedVoice.name}
                </span>
              </div>

              <div className="agent-preview-content">
                <span
                  aria-hidden="true"
                  className="agent-preview-avatar"
                >
                  <PreviewRobotIcon />
                </span>

                <div className="agent-preview-copy">
                  <h2>
                    {agentName.trim() ||
                      "Votre agent"}
                  </h2>
                  <p>
                    {welcomeMessage.trim() ||
                      "Votre message d’accueil apparaîtra ici."}
                  </p>
                </div>
              </div>

              <div className="agent-preview-footer">
                <PreviewWave />
                <div className="agent-preview-meta">
                  <span />
                  Prêt à répondre
                </div>
              </div>
            </article>
          </div>
        </div>
      </form>
    </section>
  );
}
