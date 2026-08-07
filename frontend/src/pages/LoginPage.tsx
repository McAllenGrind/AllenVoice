import {
  type FormEvent,
  useState,
} from "react";

import { useNavigate } from "react-router";

import {
  login,
  saveAccessToken,
} from "../api/api";

import "./LoginPage.css";

function AllenVoiceMark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 32 32"
    >
      <path d="M3 16h3" />
      <path d="M8 11v10" />
      <path d="M12 7v18" />
      <path d="M16 3v26" />
      <path d="M20 8v16" />
      <path d="M24 12v8" />
      <path d="M28 15v2" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg
      aria-hidden="true"
      className="login-robot-icon"
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

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="login-eye-icon"
      viewBox="0 0 24 24"
    >
      {open ? (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.2A9.2 9.2 0 0 1 12 6c6 0 9.5 6 9.5 6a15.8 15.8 0 0 1-2.5 3.1" />
          <path d="M6.1 6.1C3.8 7.7 2.5 12 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 3.1-.5" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

function ShowcaseWave() {
  const bars = [
    12, 21, 34, 18, 47, 27, 58, 36, 70, 41,
    61, 30, 53, 26, 45, 20, 37, 17, 31, 14,
    24, 11, 18, 8,
  ];

  return (
    <div
      aria-hidden="true"
      className="login-showcase-wave"
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

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
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
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section
        aria-hidden="true"
        className="login-showcase"
      >
        <div className="login-showcase-grid" />
        <div className="login-showcase-orb login-showcase-orb--top" />
        <div className="login-showcase-orb login-showcase-orb--bottom" />

        <div className="login-showcase-inner">
          <div className="login-brand login-brand--light">
            <AllenVoiceMark className="login-brand-mark" />
            <span>AllenVoice</span>
          </div>

          <div className="login-showcase-copy">
            <span className="login-eyebrow">
              Espace entreprise
            </span>
            <h1>
              Votre voix.
              <br />
              Votre intelligence.
              <br />
              Une seule interface.
            </h1>
            <p>
              Configurez votre agent, enrichissez ses
              connaissances et suivez les appels pris en
              charge par AllenVoice.
            </p>
          </div>

          <div className="login-agent-card">
            <div className="login-agent-card-top">
              <span className="login-robot-badge">
                <RobotIcon />
              </span>

              <div>
                <strong>Agent vocal IA</strong>
                <span>AllenVoice</span>
              </div>

              <span className="login-agent-dot" />
            </div>

            <ShowcaseWave />

            <div className="login-agent-tags">
              <span>Appels</span>
              <span>Connaissances</span>
              <span>Statistiques</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-mobile-brand login-brand">
            <AllenVoiceMark className="login-brand-mark" />
            <span>AllenVoice</span>
          </div>

          <div className="login-form-heading">
            <span className="login-form-kicker">
              Bienvenue
            </span>
            <h2>Connectez-vous à AllenVoice</h2>
            <p>
              Accédez à votre espace entreprise et à votre
              agent vocal.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            <div className="login-field">
              <label htmlFor="email">
                Adresse courriel
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nom@entreprise.com"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Mot de passe
              </label>

              <div className="login-password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                />

                <button
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  type="button"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div
                className="login-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            <button
              className="login-submit"
              disabled={isLoading}
              type="submit"
            >
              <span>
                {isLoading
                  ? "Connexion en cours..."
                  : "Se connecter"}
              </span>
              {!isLoading && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              )}
            </button>
          </form>

          <p className="login-footnote">
            AllenVoice · Intelligence vocale pour les entreprises
          </p>
        </div>
      </section>
    </main>
  );
}
