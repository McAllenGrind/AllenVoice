import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  type AdminCompany,
  createAdminCompany,
  getAdminCompanies,
  updateAdminCompanyStatus,
} from "../api/api";

export default function AdminCompaniesPage() {
  const [companies, setCompanies] =
    useState<AdminCompany[]>([]);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [industry, setIndustry] =
    useState("");

  const [ownerFullName, setOwnerFullName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [updatingCompanyId, setUpdatingCompanyId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const result =
          await getAdminCompanies();

        setCompanies(result);
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

    void loadCompanies();
  }, []);

  async function handleCreateCompany(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const company =
        await createAdminCompany({
          name,
          email,
          phoneNumber,
          ownerFullName,
          password,

          ...(industry.trim()
            ? {
                industry,
              }
            : {}),
        });

      setCompanies((currentCompanies) => [
        company,
        ...currentCompanies,
      ]);

      setName("");
      setEmail("");
      setPhoneNumber("");
      setIndustry("");
      setOwnerFullName("");
      setPassword("");

      setSuccess(
        "Entreprise créée avec succès.",
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

  async function handleToggleStatus(
    company: AdminCompany,
  ) {
    setError(null);
    setSuccess(null);
    setUpdatingCompanyId(company.id);

    try {
      const updated =
        await updateAdminCompanyStatus(
          company.id,
          !company.isActive,
        );

      setCompanies((currentCompanies) =>
        currentCompanies.map(
          (currentCompany) =>
            currentCompany.id === updated.id
              ? {
                  ...currentCompany,
                  ...updated,
                }
              : currentCompany,
        ),
      );

      setSuccess(
        updated.isActive
          ? "Entreprise activée."
          : "Entreprise désactivée.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setUpdatingCompanyId(null);
    }
  }

  if (isLoading) {
    return (
      <p>
        Chargement de l'administration...
      </p>
    );
  }

  const activeCompanies =
    companies.filter(
      (company) => company.isActive,
    ).length;

  return (
    <section>
      <h1>Administration</h1>

      <p>
        Gérez les entreprises clientes
        d’AllenVoice.
      </p>

      <section>
        <h2>Vue générale</h2>

        <p>
          Entreprises : {companies.length}
        </p>

        <p>
          Entreprises actives :{" "}
          {activeCompanies}
        </p>

        <p>
          Entreprises désactivées :{" "}
          {companies.length -
            activeCompanies}
        </p>
      </section>

      <section>
        <h2>Créer une entreprise</h2>

        <form
          onSubmit={handleCreateCompany}
        >
          <div>
            <label htmlFor="companyName">
              Nom de l’entreprise
            </label>

            <input
              id="companyName"
              type="text"
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="companyEmail">
              Adresse email
            </label>

            <input
              id="companyEmail"
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="companyPhone">
              Téléphone de l’entreprise
            </label>

            <input
              id="companyPhone"
              type="tel"
              required
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="industry">
              Secteur d’activité
            </label>

            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(event) =>
                setIndustry(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="ownerFullName">
              Nom du propriétaire
            </label>

            <input
              id="ownerFullName"
              type="text"
              required
              value={ownerFullName}
              onChange={(event) =>
                setOwnerFullName(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label htmlFor="initialPassword">
              Mot de passe initial
            </label>

            <input
              id="initialPassword"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Création..."
              : "Créer l’entreprise"}
          </button>
        </form>
      </section>

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {success && (
        <p>
          {success}
        </p>
      )}

      <section>
        <h2>Entreprises</h2>

        {companies.length === 0 ? (
          <p>
            Aucune entreprise enregistrée.
          </p>
        ) : (
          <div>
            {companies.map((company) => (
              <article key={company.id}>
                <h3>{company.name}</h3>

                <p>
                  {company.email}
                </p>

                <p>
                  Propriétaire :{" "}
                  {company.user?.fullName ??
                    "Non défini"}
                </p>

                <p>
                  Téléphone :{" "}
                  {company.phoneNumber}
                </p>

                <p>
                  Téléphone AllenVoice :{" "}
                  {company.voicePhoneNumber ??
                    "Non attribué"}
                </p>

                <p>
                  Agent :{" "}
                  {company.aiConfiguration
                    ?.agentName ??
                    "AllenVoice"}
                </p>

                <p>
                  Statut :{" "}
                  {company.isActive
                    ? "Active"
                    : "Désactivée"}
                </p>

                <button
                  type="button"
                  disabled={
                    updatingCompanyId ===
                    company.id
                  }
                  onClick={() =>
                    void handleToggleStatus(
                      company,
                    )
                  }
                >
                  {updatingCompanyId ===
                  company.id
                    ? "Modification..."
                    : company.isActive
                      ? "Désactiver"
                      : "Activer"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}