const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

const TOKEN_KEY = "allenvoice_access_token";

/* =========================================================
   TOKEN
========================================================= */

export function saveAccessToken(
  token: string,
): void {
  localStorage.setItem(
    TOKEN_KEY,
    token,
  );
}

export function getAccessToken():
  | string
  | null {
  return localStorage.getItem(
    TOKEN_KEY,
  );
}

export function removeAccessToken(): void {
  localStorage.removeItem(
    TOKEN_KEY,
  );
}

/* =========================================================
   CLIENT API COMMUN
========================================================= */

interface ApiFetchOptions
  extends RequestInit {
  auth?: boolean;
  fallbackError?: string;
}

interface ApiErrorBody {
  message?: string;

  error?:
  | string
  | {
    message?: string;
  };
}

async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    auth = true,
    fallbackError =
    "Une erreur est survenue.",
    headers,
    ...fetchOptions
  } = options;

  const requestHeaders =
    new Headers(headers);

  if (
    fetchOptions.body &&
    !requestHeaders.has(
      "Content-Type",
    ) &&
    !(
      fetchOptions.body instanceof
      FormData
    )
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  if (auth) {
    const token =
      getAccessToken();

    if (!token) {
      throw new Error(
        "Aucune session active.",
      );
    }

    requestHeaders.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...fetchOptions,
      headers: requestHeaders,
    },
  );

  if (
    response.status === 401 &&
    auth
  ) {
    removeAccessToken();
  }

  const text =
    await response.text();

  if (!response.ok) {
    let message = fallbackError;

    if (text) {
      try {
        const body =
          JSON.parse(
            text,
          ) as ApiErrorBody;

        if (
          typeof body.error ===
          "string"
        ) {
          message = body.error;
        } else if (
          body.error?.message
        ) {
          message =
            body.error.message;
        } else if (body.message) {
          message =
            body.message;
        }
      } catch {
        // On garde fallbackError.
      }
    }

    throw new Error(message);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/* =========================================================
   AUTH
========================================================= */

interface LoginResponse {
  data: {
    accessToken: string;
  };
}

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  companyId: string;
  isPlatformAdmin: boolean;
}

interface CurrentUserResponse {
  data: CurrentUser;
}

export async function login(
  email: string,
  password: string,
): Promise<string> {
  const body =
    await apiFetch<LoginResponse>(
      "/auth/login",
      {
        method: "POST",
        auth: false,

        body: JSON.stringify({
          email,
          password,
        }),

        fallbackError:
          "Impossible de se connecter.",
      },
    );

  return body.data.accessToken;
}

export async function getCurrentUser():
  Promise<CurrentUser> {
  const body =
    await apiFetch<CurrentUserResponse>(
      "/auth/me",
      {
        fallbackError:
          "Impossible de récupérer votre compte.",
      },
    );

  return body.data;
}

/* =========================================================
   VOICE CALLS
========================================================= */

export interface VoiceCall {
  id: string;
  twilioCallSid: string;
  fromNumber: string | null;
  toNumber: string | null;

  status:
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

  provider:
  | "OPENAI"
  | "ANTHROPIC"
  | null;

  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;

  _count: {
    messages: number;
  };
}

export interface VoiceMessage {
  id: string;

  role:
  | "CUSTOMER"
  | "AGENT";

  text: string;
  confidence: number | null;
  createdAt: string;
}

export interface VoiceCallDetail {
  id: string;
  twilioCallSid: string;
  fromNumber: string | null;
  toNumber: string | null;

  status:
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;

  messages: VoiceMessage[];
}

interface VoiceCallsResponse {
  data: VoiceCall[];
}

interface VoiceCallResponse {
  data: VoiceCallDetail;
}

export async function getVoiceCalls():
  Promise<VoiceCall[]> {
  const body =
    await apiFetch<VoiceCallsResponse>(
      "/voice/calls",
      {
        fallbackError:
          "Impossible de récupérer les appels.",
      },
    );

  return body.data;
}

export async function getVoiceCall(
  id: string,
): Promise<VoiceCallDetail> {
  const body =
    await apiFetch<VoiceCallResponse>(
      `/voice/calls/${id}`,
      {
        fallbackError:
          "Impossible de récupérer cet appel.",
      },
    );

  return body.data;
}

/* =========================================================
   KNOWLEDGE BASE
========================================================= */

export type KnowledgeSourceType =
  | "TEXT"
  | "FAQ"
  | "PDF"
  | "WORD"
  | "EXCEL"
  | "POWERPOINT"
  | "CSV"
  | "TXT"
  | "IMAGE";

export type KnowledgeDocumentStatus =
  | "PROCESSING"
  | "READY"
  | "FAILED";

export type KnowledgeAudience =
  | "CUSTOMER"
  | "INTERNAL";

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string | null;
  content: string;

  sourceType:
  KnowledgeSourceType;

  status:
  KnowledgeDocumentStatus;

  audience:
  KnowledgeAudience;

  isActive: boolean;

  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  storageKey: string | null;

  extractionMode:
  string | null;

  pageCount:
  number | null;

  failureReason:
  string | null;

  processedAt:
  string | null;

  createdAt: string;
  updatedAt: string;

  knowledgeBaseId: string;

  _count?: {
    chunks: number;
  };
}

export interface CreateKnowledgeDocumentInput {
  title: string;
  category?: string;
  content: string;
  sourceType?: KnowledgeSourceType;
  isActive?: boolean;
}

export interface UploadKnowledgeDocumentInput {
  file: File;
  title: string;
  category?: string;
  audience?: KnowledgeAudience;
}

export interface UpdateKnowledgeDocumentInput {
  title?: string;
  category?: string;
  content?: string;
  isActive?: boolean;
}

interface KnowledgeDocumentsResponse {
  data: KnowledgeDocument[];
}

interface KnowledgeDocumentResponse {
  data: KnowledgeDocument;
}

export async function getKnowledgeDocuments():
  Promise<KnowledgeDocument[]> {
  const body =
    await apiFetch<KnowledgeDocumentsResponse>(
      "/knowledge",
      {
        fallbackError:
          "Impossible de récupérer la base de connaissances.",
      },
    );

  return body.data;
}

export async function uploadKnowledgeDocument(
  input: UploadKnowledgeDocumentInput,
): Promise<KnowledgeDocument> {
  const formData =
    new FormData();

  formData.append(
    "file",
    input.file,
  );

  formData.append(
    "title",
    input.title.trim(),
  );

  const category =
    input.category?.trim();

  if (category) {
    formData.append(
      "category",
      category,
    );
  }

  formData.append(
    "audience",
    input.audience ??
    "CUSTOMER",
  );

  const body =
    await apiFetch<KnowledgeDocumentResponse>(
      "/knowledge/upload",
      {
        method: "POST",
        body: formData,

        fallbackError:
          "Impossible d’importer ce fichier.",
      },
    );

  return body.data;
}

export async function createKnowledgeDocument(
  input: CreateKnowledgeDocumentInput,
): Promise<KnowledgeDocument> {
  const body =
    await apiFetch<KnowledgeDocumentResponse>(
      "/knowledge",
      {
        method: "POST",

        body:
          JSON.stringify(input),

        fallbackError:
          "Impossible d'ajouter cette information.",
      },
    );

  return body.data;
}

export async function updateKnowledgeDocument(
  id: string,
  input: UpdateKnowledgeDocumentInput,
): Promise<KnowledgeDocument> {
  const body =
    await apiFetch<KnowledgeDocumentResponse>(
      `/knowledge/${id}`,
      {
        method: "PATCH",

        body:
          JSON.stringify(input),

        fallbackError:
          "Impossible de modifier cette information.",
      },
    );

  return body.data;
}

export async function deleteKnowledgeDocument(
  id: string,
): Promise<void> {
  await apiFetch<void>(
    `/knowledge/${id}`,
    {
      method: "DELETE",

      fallbackError:
        "Impossible de supprimer cette information.",
    },
  );
}

/* =========================================================
   AGENT
========================================================= */

export interface AgentConfiguration {
  id: string;
  companyId: string;
  agentName: string;
  systemPrompt: string;
  language: string;
  voice: string;
  welcomeMessage: string;
  temperature: number;
}

export interface UpdateAgentConfigurationInput {
  agentName?: string;
  language?: string;
  voice?: string;
  welcomeMessage?: string;
}

interface AgentConfigurationResponse {
  data: AgentConfiguration;
}

export async function getAgentConfiguration():
  Promise<AgentConfiguration> {
  const body =
    await apiFetch<AgentConfigurationResponse>(
      "/agent/config",
      {
        fallbackError:
          "Impossible de récupérer la configuration de l'agent.",
      },
    );

  return body.data;
}

export async function updateAgentConfiguration(
  input: UpdateAgentConfigurationInput,
): Promise<AgentConfiguration> {
  const body =
    await apiFetch<AgentConfigurationResponse>(
      "/agent/config",
      {
        method: "PATCH",

        body:
          JSON.stringify(input),

        fallbackError:
          "Impossible de modifier la configuration de l'agent.",
      },
    );

  return body.data;
}

/* =========================================================
   ACCOUNT
========================================================= */

export interface UpdateAccountProfileInput {
  fullName: string;
  email: string;
}

interface UpdateAccountProfileResponse {
  data: CurrentUser;
}

interface UpdatePasswordResponse {
  data: {
    message: string;
  };
}

export async function updateAccountProfile(
  input: UpdateAccountProfileInput,
): Promise<CurrentUser> {
  const body =
    await apiFetch<UpdateAccountProfileResponse>(
      "/account/profile",
      {
        method: "PATCH",
        body: JSON.stringify(input),

        fallbackError:
          "Impossible de modifier votre profil.",
      },
    );

  return body.data;
}

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const body =
    await apiFetch<UpdatePasswordResponse>(
      "/account/password",
      {
        method: "PATCH",

        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),

        fallbackError:
          "Impossible de modifier votre mot de passe.",
      },
    );

  return body.data.message;
}

/* =========================================================
   PLATFORM ADMIN
========================================================= */

export interface AdminCompany {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  voicePhoneNumber: string | null;
  industry: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  } | null;

  aiConfiguration: {
    id: string;
    agentName: string;
    language: string;
    voice: string;
    welcomeMessage: string;
    temperature: number;
  } | null;
}

export interface CreateAdminCompanyInput {
  name: string;
  email: string;
  phoneNumber: string;
  industry?: string;
  ownerFullName: string;
  password: string;
}

interface AdminCompaniesResponse {
  data: AdminCompany[];
}

interface AdminCompanyResponse {
  data: AdminCompany;
  message?: string;
}

export async function getAdminCompanies():
  Promise<AdminCompany[]> {
  const body =
    await apiFetch<AdminCompaniesResponse>(
      "/admin/companies",
      {
        fallbackError:
          "Impossible de récupérer les entreprises.",
      },
    );

  return body.data;
}

export async function createAdminCompany(
  input: CreateAdminCompanyInput,
): Promise<AdminCompany> {
  const body =
    await apiFetch<AdminCompanyResponse>(
      "/admin/companies",
      {
        method: "POST",
        body: JSON.stringify(input),

        fallbackError:
          "Impossible de créer l'entreprise.",
      },
    );

  return body.data;
}

export async function updateAdminCompanyStatus(
  companyId: string,
  isActive: boolean,
): Promise<AdminCompany> {
  const body =
    await apiFetch<AdminCompanyResponse>(
      `/admin/companies/${companyId}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          isActive,
        }),

        fallbackError:
          "Impossible de modifier le statut de l'entreprise.",
      },
    );

  return body.data;
}