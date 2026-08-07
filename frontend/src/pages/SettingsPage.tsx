import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router";

import {
  getCurrentUser,
  removeAccessToken,
  updateAccountPassword,
  updateAccountProfile,
  type CurrentUser,
} from "../api/api";

import "./SettingsPage.css";

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="10" rx="2" width="16" x="4" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.4 0 9 4.5 9 8a8.2 8.2 0 0 1-1.6 3.7" />
      <path d="M6.2 6.2C4.2 7.7 3 10 3 12c0 3.5 3.6 8 9 8a10 10 0 0 0 4.1-.9" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function WaveDecoration() {
  const heights = [
    12, 22, 34, 18, 27, 44, 31, 16, 24, 39, 52, 34, 20, 29, 45, 26,
    14,
  ];

  return (
    <div aria-hidden="true" className="settings-wave-decoration">
      {heights.map((height, index) => (
        <span key={`${height}-${index}`} style={{ height }} />
      ))}
    </div>
  );
}

function FeedbackMessage({
  type,
  children,
}: {
  type: "success" | "error";
  children: string;
}) {
  return (
    <div
      className={`settings-feedback settings-feedback--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {type === "success" ? <CheckIcon /> : <AlertIcon />}
      <span>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);
        setFullName(currentUser.fullName);
        setEmail(currentUser.email);
      } catch (error) {
        setProfileError(
          error instanceof Error
            ? error.message
            : "Impossible de charger le compte.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, []);

  const initials = useMemo(() => {
    const source = fullName.trim() || user?.email || "AV";
    const words = source.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [fullName, user?.email]);

  const profileHasChanges = Boolean(
    user &&
      (fullName.trim() !== user.fullName ||
        email.trim() !== user.email),
  );

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      const updatedUser = await updateAccountProfile({
        fullName: fullName.trim(),
        email: email.trim(),
      });

      setUser(updatedUser);
      setFullName(updatedUser.fullName);
      setEmail(updatedUser.email);
      setProfileSuccess("Modifications enregistrées avec succès.");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le profil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const message = await updateAccountPassword(
        currentPassword,
        newPassword,
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(message);
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le mot de passe.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleLogout() {
    removeAccessToken();
    navigate("/login");
  }

  if (isLoading) {
    return (
      <section className="settings-page">
        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">Votre compte</span>
            <h1>Paramètres</h1>
            <p>Gérez les informations et la sécurité de votre compte.</p>
          </div>
        </header>

        <div className="settings-loading-grid" aria-label="Chargement des paramètres">
          <div className="settings-loading-card" />
          <div className="settings-loading-card" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="settings-page">
        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">Votre compte</span>
            <h1>Paramètres</h1>
            <p>Gérez les informations et la sécurité de votre compte.</p>
          </div>
        </header>

        <FeedbackMessage type="error">
          {profileError ?? "Impossible de charger le compte."}
        </FeedbackMessage>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <span className="settings-eyebrow">Votre compte</span>
          <h1>Paramètres</h1>
          <p>Gérez les informations et la sécurité de votre compte.</p>
        </div>

        <WaveDecoration />
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <ProfileIcon />
            </div>
            <div>
              <h2>Informations du profil</h2>
              <p>Ces informations identifient votre compte AllenVoice.</p>
            </div>
          </div>

          <div className="settings-profile-summary">
            <div className="settings-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleProfileSubmit}>
            <div className="settings-field">
              <label htmlFor="fullName">Nom complet</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setProfileSuccess(null);
                }}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="email">Adresse courriel</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setProfileSuccess(null);
                }}
              />
            </div>

            <div className="settings-form-footer">
              <button
                className="settings-primary-button"
                type="submit"
                disabled={isSavingProfile || !profileHasChanges}
              >
                {isSavingProfile
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>

              {profileSuccess && (
                <FeedbackMessage type="success">{profileSuccess}</FeedbackMessage>
              )}

              {profileError && (
                <FeedbackMessage type="error">{profileError}</FeedbackMessage>
              )}
            </div>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <LockIcon />
            </div>
            <div>
              <h2>Sécurité</h2>
              <p>Modifiez le mot de passe utilisé pour accéder à votre compte.</p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <div className="settings-field">
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <div className="settings-password-input">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordSuccess(null);
                  }}
                />
                <button
                  aria-label={showCurrentPassword ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"}
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  type="button"
                >
                  <EyeIcon hidden={!showCurrentPassword} />
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <div className="settings-password-input">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordSuccess(null);
                  }}
                />
                <button
                  aria-label={showNewPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}
                  onClick={() => setShowNewPassword((current) => !current)}
                  type="button"
                >
                  <EyeIcon hidden={!showNewPassword} />
                </button>
              </div>
              <span className="settings-field-help">8 caractères minimum.</span>
            </div>

            <div className="settings-field">
              <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
              <div className="settings-password-input">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordSuccess(null);
                  }}
                />
                <button
                  aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  <EyeIcon hidden={!showConfirmPassword} />
                </button>
              </div>
            </div>

            <div className="settings-form-footer">
              <button
                className="settings-primary-button"
                type="submit"
                disabled={
                  isSavingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isSavingPassword
                  ? "Modification..."
                  : "Mettre à jour le mot de passe"}
              </button>

              {passwordSuccess && (
                <FeedbackMessage type="success">{passwordSuccess}</FeedbackMessage>
              )}

              {passwordError && (
                <FeedbackMessage type="error">{passwordError}</FeedbackMessage>
              )}
            </div>
          </form>
        </section>
      </div>

      <section className="settings-logout-card">
        <div className="settings-logout-copy">
          <div className="settings-card-icon settings-card-icon--neutral">
            <LogoutIcon />
          </div>
          <div>
            <h2>Déconnexion</h2>
            <p>Vous serez déconnecté de votre compte AllenVoice sur cet appareil.</p>
          </div>
        </div>

        <button className="settings-logout-button" onClick={handleLogout} type="button">
          <LogoutIcon />
          Se déconnecter
        </button>
      </section>
    </section>
  );
}
