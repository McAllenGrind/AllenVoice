export type AllenVoicePreset =
  | "ALLEN_1"
  | "ALLEN_2"
  | "ALLEN_3";

export type SupportedVoiceLanguage =
  | "fr-CA"
  | "fr-FR"
  | "en-US";

type RuntimeVoiceLanguage =
  | "fr-CA"
  | "en-US";

export const SUPPORTED_VOICE_LANGUAGES:
  SupportedVoiceLanguage[] = [
    "fr-CA",
    "fr-FR",
    "en-US",
  ];

export const ALLEN_VOICE_PRESETS:
  AllenVoicePreset[] = [
    "ALLEN_1",
    "ALLEN_2",
    "ALLEN_3",
  ];

const VOICE_ENV_KEYS: Record<
  RuntimeVoiceLanguage,
  Record<AllenVoicePreset, string>
> = {
  "fr-CA": {
    ALLEN_1:
      "ALLENVOICE_VOICE_ALLEN_1_FR",

    ALLEN_2:
      "ALLENVOICE_VOICE_ALLEN_2_FR",

    ALLEN_3:
      "ALLENVOICE_VOICE_ALLEN_3_FR",
  },

  "en-US": {
    ALLEN_1:
      "ALLENVOICE_VOICE_ALLEN_1_EN",

    ALLEN_2:
      "ALLENVOICE_VOICE_ALLEN_2_EN",

    ALLEN_3:
      "ALLENVOICE_VOICE_ALLEN_3_EN",
  },
};

export function isSupportedVoiceLanguage(
  value: string,
): value is SupportedVoiceLanguage {
  return SUPPORTED_VOICE_LANGUAGES.includes(
    value as SupportedVoiceLanguage,
  );
}

export function isAllenVoicePreset(
  value: string,
): value is AllenVoicePreset {
  return ALLEN_VOICE_PRESETS.includes(
    value as AllenVoicePreset,
  );
}

function normalizeRuntimeLanguage(
  language: string,
): RuntimeVoiceLanguage {
  if (language === "en-US") {
    return "en-US";
  }

  return "fr-CA";
}

function getConfiguredVoice(
  language: RuntimeVoiceLanguage,
  preset: AllenVoicePreset,
): string | null {
  const environmentKey =
    VOICE_ENV_KEYS[language][preset];

  return (
    process.env[
      environmentKey
    ]?.trim() || null
  );
}

export function resolveTwilioVoice(
  language: string,
  preset: string,
): string {
  const safePreset:
    AllenVoicePreset =
    isAllenVoicePreset(preset)
      ? preset
      : "ALLEN_1";

  const safeLanguage =
    normalizeRuntimeLanguage(
      language,
    );

  const configuredVoice =
    getConfiguredVoice(
      safeLanguage,
      safePreset,
    );

  if (configuredVoice) {
    return configuredVoice;
  }

  /*
   * Tant que les voix anglaises ne sont pas
   * configurées, on conserve la voix française
   * correspondante au lieu de faire planter l’appel.
   */
  if (safeLanguage === "en-US") {
    const matchingFrenchVoice =
      getConfiguredVoice(
        "fr-CA",
        safePreset,
      );

    if (matchingFrenchVoice) {
      return matchingFrenchVoice;
    }
  }

  /*
   * Compatibilité avec l’ancienne variable.
   */
  const legacyVoice =
    process.env
      .CONVERSATION_RELAY_VOICE_ID
      ?.trim();

  if (legacyVoice) {
    return legacyVoice;
  }

  /*
   * Ancienne voix utilisée par AllenVoice.
   */
  return "IPgYtHTNLjC7Bq7IPHrm";
}