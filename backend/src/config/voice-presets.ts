export type AllenVoicePreset =
  | "ALLEN_1"
  | "ALLEN_2"
  | "ALLEN_3";

export type SupportedVoiceLanguage =
  | "fr-CA"
  | "fr-FR"
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

const voiceMap: Record<
  SupportedVoiceLanguage,
  Record<AllenVoicePreset, string>
> = {
  "fr-CA": {
    ALLEN_1:
      "Google.fr-CA-Chirp3-HD-Aoede",

    ALLEN_2:
      "Google.fr-CA-Chirp3-HD-Charon",

    ALLEN_3:
      "Polly.Gabrielle-Neural",
  },

  "fr-FR": {
    ALLEN_1:
      "Google.fr-FR-Chirp3-HD-Aoede",

    ALLEN_2:
      "Google.fr-FR-Chirp3-HD-Charon",

    ALLEN_3:
      "Polly.Lea-Neural",
  },

  "en-US": {
    ALLEN_1:
      "Google.en-US-Chirp3-HD-Aoede",

    ALLEN_2:
      "Google.en-US-Chirp3-HD-Charon",

    ALLEN_3:
      "Google.en-US-Chirp3-HD-Kore",
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

export function resolveTwilioVoice(
  language: string,
  preset: string,
): string {
  const safeLanguage:
    SupportedVoiceLanguage =
    isSupportedVoiceLanguage(language)
      ? language
      : "fr-CA";

  const safePreset: AllenVoicePreset =
    isAllenVoicePreset(preset)
      ? preset
      : "ALLEN_1";

  return voiceMap[safeLanguage][safePreset];
}