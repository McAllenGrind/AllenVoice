import { AppError } from "../utils/app-error.js";
import { companyRepository } from "../repositories/company.repository.js";


export const voiceRoutingService = {
  async getCompanyByPhoneNumber(
    phoneNumber: string,
  ) {
    const normalizedNumber =
      phoneNumber.trim();

    if (!normalizedNumber) {
      throw new AppError(
        400,
        "Numéro AllenVoice manquant.",
      );
    }

    const company =
      await companyRepository.findByVoicePhoneNumber(
        normalizedNumber,
      );

    if (!company) {
      throw new AppError(
        404,
        "Aucune entreprise AllenVoice associée à ce numéro.",
      );
    }

    if (!company.isActive) {
      throw new AppError(
        403,
        "Cette entreprise AllenVoice est inactive.",
      );
    }

    return company;
  },
};