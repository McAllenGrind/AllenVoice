import {
    type FormEvent,
    useEffect,
    useState,
} from "react";

import {
    getAgentConfiguration,
    updateAgentConfiguration,
} from "../api/api";

export default function AgentPage() {
    const [agentName, setAgentName] =
        useState("");

    const [welcomeMessage, setWelcomeMessage] =
        useState("");

    const [language, setLanguage] =
        useState("");

    const [voice, setVoice] =
        useState("");

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [success, setSuccess] =
        useState<string | null>(null);

    useEffect(() => {
        async function loadConfiguration() {
            try {
                const configuration =
                    await getAgentConfiguration();

                setAgentName(
                    configuration.agentName,
                );

                setWelcomeMessage(
                    configuration.welcomeMessage,
                );

                setLanguage(
                    configuration.language,
                );

                setVoice(
                    configuration.voice,
                );
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

        void loadConfiguration();
    }, []);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);
        setSuccess(null);
        setIsSaving(true);

        try {
            const updated =
                await updateAgentConfiguration({
                    agentName,
                    welcomeMessage,
                    language,
                    voice,
                });

            setAgentName(
                updated.agentName,
            );

            setWelcomeMessage(
                updated.welcomeMessage,
            );

            setLanguage(updated.language);
            setVoice(updated.voice);

            setSuccess(
                "Configuration enregistrée.",
            );
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

    if (isLoading) {
        return (
            <p>
                Chargement de l'agent AllenVoice...
            </p>
        );
    }

    return (
        <section>
            <h1>Agent IA</h1>

            <p>
                Configurez votre agent vocal AllenVoice.
            </p>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="agentName">
                        Nom de l'agent
                    </label>

                    <input
                        id="agentName"
                        type="text"
                        required
                        maxLength={50}
                        value={agentName}
                        placeholder="Ex. Sophie"
                        onChange={(event) =>
                            setAgentName(
                                event.target.value,
                            )
                        }
                    />
                </div>
                
                <div>
                    <label htmlFor="welcomeMessage">
                        Message d'accueil
                    </label>

                    <textarea
                        id="welcomeMessage"
                        rows={4}
                        required
                        value={welcomeMessage}
                        onChange={(event) =>
                            setWelcomeMessage(
                                event.target.value,
                            )
                        }
                    />
                </div>

                <div>
                    <label htmlFor="language">
                        Langue
                    </label>

                    <select
                        id="language"
                        value="fr-CA"
                        disabled
                    >
                        <option value="fr-CA">
                            Français — Canada
                        </option>
                    </select>
                </div>

                <div>
                    <label htmlFor="voice">
                        Voix
                    </label>

                    <select
                        id="voice"
                        value={voice}
                        onChange={(event) =>
                            setVoice(event.target.value)
                        }
                    >
                        <option value="ALLEN_1">
                            Voix 1
                        </option>

                        <option value="ALLEN_2">
                            Voix 2
                        </option>

                        <option value="ALLEN_3">
                            Voix 3
                        </option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                >
                    {isSaving
                        ? "Enregistrement..."
                        : "Enregistrer"}
                </button>
            </form>

            {success && (
                <p>{success}</p>
            )}

            {error && (
                <p role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}