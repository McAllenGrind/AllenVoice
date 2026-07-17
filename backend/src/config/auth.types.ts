export interface LoginInput {
  email: string;
  password: string;
}

export interface AccessTokenPayload {
  userId: string;
  companyId: string;
}