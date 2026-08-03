import {
  type FormEvent,
  useState,
} from "react";

import { useNavigate } from "react-router";

import {
  login,
  saveAccessToken,
} from "../api/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      const token = await login(
        email,
        password,
      );

      saveAccessToken(token);

      navigate("/dashboard");
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

  return (
    <main>
      <h1>AllenVoice</h1>

      <p>
        Connectez-vous à votre espace entreprise.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">
            Adresse courriel
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="password">
            Mot de passe
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
          />
        </div>

        {error && (
          <p role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading
            ? "Connexion..."
            : "Se connecter"}
        </button>
      </form>
    </main>
  );
}