import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  updateAccountPassword,
  updateAccountProfile,
  type CurrentUser,
} from "../api/api";

export default function SettingsPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [
    isSavingPassword,
    setIsSavingPassword,
  ] = useState(false);

  const [profileError, setProfileError] =
    useState<string | null>(null);

  const [profileSuccess, setProfileSuccess] =
    useState<string | null>(null);

  const [passwordError, setPasswordError] =
    useState<string | null>(null);

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser =
          await getCurrentUser();

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

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      const updatedUser =
        await updateAccountProfile({
          fullName,
          email,
        });

      setUser(updatedUser);
      setFullName(updatedUser.fullName);
      setEmail(updatedUser.email);

      setProfileSuccess(
        "Profil modifié avec succès.",
      );
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

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "Les nouveaux mots de passe ne correspondent pas.",
      );

      return;
    }

    setIsSavingPassword(true);

    try {
      const message =
        await updateAccountPassword(
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

  if (isLoading) {
    return (
      <p>
        Chargement des paramètres...
      </p>
    );
  }

  if (!user) {
    return (
      <section>
        <h1>Paramètres</h1>

        <p role="alert">
          {profileError ??
            "Impossible de charger le compte."}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Paramètres</h1>

      <p>
        Gérez votre compte AllenVoice.
      </p>

      <hr />

      <section>
        <h2>Informations du compte</h2>

        <form onSubmit={handleProfileSubmit}>
          <div>
            <label htmlFor="fullName">
              Nom complet
            </label>

            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="email">
              Adresse courriel
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
          >
            {isSavingProfile
              ? "Enregistrement..."
              : "Enregistrer le profil"}
          </button>
        </form>

        {profileSuccess && (
          <p>{profileSuccess}</p>
        )}

        {profileError && (
          <p role="alert">
            {profileError}
          </p>
        )}
      </section>

      <hr />

      <section>
        <h2>Changer le mot de passe</h2>

        <form onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="currentPassword">
              Mot de passe actuel
            </label>

            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="newPassword">
              Nouveau mot de passe
            </label>

            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">
              Confirmer le nouveau mot de passe
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
          >
            {isSavingPassword
              ? "Modification..."
              : "Changer le mot de passe"}
          </button>
        </form>

        {passwordSuccess && (
          <p>{passwordSuccess}</p>
        )}

        {passwordError && (
          <p role="alert">
            {passwordError}
          </p>
        )}
      </section>
    </section>
  );
}