export interface CreateCompanyInput {
  name: string;
  email: string;
  phoneNumber: string;
  industry?: string;
  ownerFullName: string;
  password: string;
}