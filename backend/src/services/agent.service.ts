import { AppError } from "../utils/app-error.js";

import {
    agentRepository,
    type UpdateAgentConfigurationData,
} from "../repositories/agent.repository.js";

import {
    isAllenVoicePreset,
    isSupportedVoiceLanguage,
} from "../config/voice-presets.js";

export interface UpdateAgentConfigurationInput {
    agentName?: string;
    systemPrompt?: string;
    language?: string;
    voice?: string;
    welcomeMessage?: string;
    temperature?: number;
}

function normalizeOptionalText(
    value: unknown,
    fieldName: string,
): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new AppError(
            400,
            `${fieldName} doit être une chaîne de caractères.`,
        );
    }

    const trimmed = value.trim();

    if (!trimmed) {
        throw new AppError(
            400,
            `${fieldName} ne peut pas être vide.`,
        );
    }

    return trimmed;
}

export const agentService = {
    async getConfiguration(companyId: string) {
        const configuration =
            await agentRepository.findByCompanyId(
                companyId,
            );

        if (!configuration) {
            throw new AppError(
                404,
                "Configuration de l'agent introuvable.",
            );
        }

        return configuration;
    },

    async updateConfiguration(
        companyId: string,
        input: UpdateAgentConfigurationInput,
    ) {
        const existing =
            await agentRepository.findByCompanyId(
                companyId,
            );

        if (!existing) {
            throw new AppError(
                404,
                "Configuration de l'agent introuvable.",
            );
        }

        const data: UpdateAgentConfigurationData = {};

        const agentName =
            normalizeOptionalText(
                input.agentName,
                "Le nom de l'agent",
            );

        if (
            agentName !== undefined &&
            agentName.length > 50
        ) {
            throw new AppError(
                400,
                "Le nom de l'agent ne peut pas dépasser 50 caractères.",
            );
        }

        const systemPrompt =
            normalizeOptionalText(
                input.systemPrompt,
                "Le comportement de l'agent",
            );

        const language =
            normalizeOptionalText(
                input.language,
                "La langue",
            );
        if (
            language !== undefined &&
            !isSupportedVoiceLanguage(language)
        ) {
            throw new AppError(
                400,
                "Langue non prise en charge par AllenVoice.",
            );
        }

        const voice =
            normalizeOptionalText(
                input.voice,
                "La voix",
            );
        if (
            voice !== undefined &&
            !isAllenVoicePreset(voice)
        ) {
            throw new AppError(
                400,
                "Voix AllenVoice invalide.",
            );
        }

        const welcomeMessage =
            normalizeOptionalText(
                input.welcomeMessage,
                "Le message d'accueil",
            );

        if (agentName !== undefined) {
            data.agentName = agentName;
        }

        if (systemPrompt !== undefined) {
            data.systemPrompt = systemPrompt;
        }

        if (language !== undefined) {
            data.language = language;
        }

        if (voice !== undefined) {
            data.voice = voice;
        }

        if (welcomeMessage !== undefined) {
            data.welcomeMessage =
                welcomeMessage;
        }

        if (input.temperature !== undefined) {
            if (
                typeof input.temperature !==
                "number" ||
                !Number.isFinite(
                    input.temperature,
                )
            ) {
                throw new AppError(
                    400,
                    "La température doit être un nombre.",
                );
            }

            if (
                input.temperature < 0 ||
                input.temperature > 1
            ) {
                throw new AppError(
                    400,
                    "La température doit être comprise entre 0 et 1.",
                );
            }

            data.temperature =
                input.temperature;
        }

        if (Object.keys(data).length === 0) {
            throw new AppError(
                400,
                "Aucune modification valide fournie.",
            );
        }

        return agentRepository.update(
            companyId,
            data,
        );
    },
};