export type CallLanguage =
    | "fr-CA"
    | "en-US";

export type LanguageDecisionReason =
    | "EXPLICIT_REQUEST"
    | "CLEAR_SENTENCE"
    | "CONFIRMED_ON_TWO_TURNS"
    | "CURRENT_LANGUAGE"
    | "MIXED_SENTENCE"
    | "NEUTRAL_TERMS"
    | "INSUFFICIENT_EVIDENCE";

export interface CallLanguageState {
    currentLanguage: CallLanguage;

    candidateLanguage:
    | CallLanguage
    | null;

    consecutiveCandidateTurns:
    number;
}

export interface CallLanguageEvaluation {
    nextState: CallLanguageState;

    shouldSwitch: boolean;

    detectedLanguage:
    | CallLanguage
    | null;

    reason:
    LanguageDecisionReason;

    frenchScore: number;
    englishScore: number;
}

interface EvaluateCallLanguageInput {
    state: CallLanguageState;
    text: string;

    /*
     * Valeur envoyée par Twilio :
     * "fr", "fr-CA", "en", "en-US", etc.
     */
    providerLanguage?: string;
}

const NEUTRAL_TERMS =
    new Set([
        /*
         * Marques et entreprises.
         */
        "allenvoice",
        "apple",
        "google",
        "samsung",
        "microsoft",
        "facebook",
        "instagram",
        "tiktok",
        "telus",
        "koodo",
        "twilio",
        "elevenlabs",
        "deepgram",

        /*
         * Produits et formats.
         */
        "iphone",
        "ipad",
        "android",
        "excel",
        "word",
        "powerpoint",
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "csv",
        "wifi",
        "wi-fi",
        "email",
        "sms",

        /*
         * Termes techniques couramment utilisés
         * dans une conversation française.
         */
        "screen",
        "replacement",
        "software",
        "hardware",
        "application",
        "app",
        "login",
        "dashboard",
        "internet",
        "bluetooth",
        "cloud",
        "code",
        "promotion",
        "online",
    ]);

const FRENCH_MARKERS =
    new Set([
        "je",
        "j",
        "tu",
        "vous",
        "nous",
        "ils",
        "elles",
        "le",
        "la",
        "les",
        "un",
        "une",
        "des",
        "du",
        "de",
        "dans",
        "sur",
        "est",
        "suis",
        "etes",
        "avez",
        "ai",
        "pour",
        "avec",
        "sans",
        "comment",
        "combien",
        "quel",
        "quelle",
        "quels",
        "quelles",
        "pouvez",
        "pourriez",
        "voudrais",
        "veux",
        "besoin",
        "merci",
        "bonjour",
        "oui",
        "non",
        "mais",
        "et",
        "ou",
        "quand",
        "pourquoi",
        "ce",
        "c",
        "cette",
        "ca",
        "mon",
        "ma",
        "mes",
        "votre",
        "vos",
        "notre",
        "nos",
    ]);

const ENGLISH_MARKERS =
    new Set([
        "i",
        "you",
        "we",
        "they",
        "he",
        "she",
        "it",
        "the",
        "an",
        "is",
        "are",
        "am",
        "was",
        "were",
        "do",
        "does",
        "did",
        "can",
        "could",
        "would",
        "should",
        "want",
        "need",
        "please",
        "thank",
        "thanks",
        "hello",
        "what",
        "when",
        "where",
        "why",
        "how",
        "much",
        "many",
        "your",
        "my",
        "our",
        "their",
        "for",
        "with",
        "without",
        "and",
        "but",
        "tell",
        "help",
        "have",
        "has",
        "open",
        "closed",
        "price",
        "hours",
        "today",
        "tomorrow",
    ]);

const REQUEST_ENGLISH_PATTERNS = [
    "parler anglais",
    "parlez anglais",
    "repondre en anglais",
    "repondez en anglais",
    "continuer en anglais",
    "continuez en anglais",
    "je prefere anglais",
    "je prefere l anglais",
    "can we speak english",
    "could we speak english",
    "please speak english",
    "do you speak english",
    "can you speak english",
    "could you speak english",
    "pouvez vous parler anglais",
    "pouvez vous parler en anglais",
    "est ce que vous pouvez parler anglais",
    "est ce que vous pouvez parler en anglais",
    "est-ce que vous pouvez parler anglais",
    "est-ce que vous pouvez parler en anglais",
    "vous pouvez parler anglais",
    "vous pouvez parler en anglais",
    "switch to english",
    "continue in english",
    "answer in english",
    "english please",
];

const REQUEST_FRENCH_PATTERNS = [
    "parler francais",
    "parlez francais",
    "repondre en francais",
    "repondez en francais",
    "continuer en francais",
    "continuez en francais",
    "je prefere francais",
    "on continue en francais",
    "continue en francais",
    "continuez en francais",
    "continuons en francais",
    "parlons en francais",
    "french please",
    "please speak french",
    "switch to french",
    "continue in french",
    "can we speak french",
    "could we speak french",
    "please speak french",
    "answer in french",
    "french please",
];

export function createInitialCallLanguageState():
    CallLanguageState {
    return {
        currentLanguage:
            "fr-CA",

        candidateLanguage:
            null,

        consecutiveCandidateTurns:
            0,
    };
}

function normalizeText(
    text: string,
): string {
    return text
        /*
         * Retire les codes comme :
         * XLSX-318, PDF, API, ALPHA-742.
         */
        .replace(
            /\b[A-Z]{2,}(?:[-_][A-Z0-9]+)*\b/g,
            " ",
        )
        .replace(
            /\b(?:https?:\/\/|www\.)\S+/gi,
            " ",
        )
        .replace(
            /\b[\w.+-]+@[\w.-]+\.\w+\b/gi,
            " ",
        )
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /[’']/g,
            " ",
        )
        .replace(
            /[^a-z\s-]/g,
            " ",
        )
        .replace(
            /\s+/g,
            " ",
        )
        .trim();
}

function getMeaningfulTokens(
    text: string,
): string[] {
    return normalizeText(text)
        .split(" ")
        .filter(Boolean)
        .filter(
            (token) =>
                token.length > 1,
        )
        .filter(
            (token) =>
                !NEUTRAL_TERMS.has(
                    token,
                ),
        );
}

function countMarkers(
    tokens: string[],
    markers: Set<string>,
): number {
    return tokens.reduce(
        (
            score,
            token,
        ) =>
            markers.has(token)
                ? score + 1
                : score,
        0,
    );
}

function normalizeProviderLanguage(
    language:
        | string
        | undefined,
): CallLanguage | null {
    const normalized =
        language
            ?.trim()
            .toLowerCase();

    if (
        normalized === "en" ||
        normalized?.startsWith(
            "en-",
        )
    ) {
        return "en-US";
    }

    if (
        normalized === "fr" ||
        normalized?.startsWith(
            "fr-",
        )
    ) {
        return "fr-CA";
    }

    return null;
}

function detectExplicitRequest(
    text: string,
): CallLanguage | null {
    const normalized =
        normalizeText(text);

    if (
        REQUEST_ENGLISH_PATTERNS.some(
            (pattern) =>
                normalized.includes(
                    pattern,
                ),
        )
    ) {
        return "en-US";
    }

    if (
        REQUEST_FRENCH_PATTERNS.some(
            (pattern) =>
                normalized.includes(
                    pattern,
                ),
        )
    ) {
        return "fr-CA";
    }

    return null;
}

function resetCandidate(
    state: CallLanguageState,
): CallLanguageState {
    return {
        ...state,

        candidateLanguage:
            null,

        consecutiveCandidateTurns:
            0,
    };
}

export function evaluateCallLanguage(
    input: EvaluateCallLanguageInput,
): CallLanguageEvaluation {
    const explicitTarget =
        detectExplicitRequest(
            input.text,
        );

    if (explicitTarget) {
        return {
            nextState: {
                currentLanguage:
                    explicitTarget,

                candidateLanguage:
                    null,

                consecutiveCandidateTurns:
                    0,
            },

            shouldSwitch:
                explicitTarget !==
                input.state.currentLanguage,

            detectedLanguage:
                explicitTarget,

            reason:
                "EXPLICIT_REQUEST",

            frenchScore:
                0,

            englishScore:
                0,
        };
    }

    const tokens =
        getMeaningfulTokens(
            input.text,
        );

    const frenchScore =
        countMarkers(
            tokens,
            FRENCH_MARKERS,
        );

    const englishScore =
        countMarkers(
            tokens,
            ENGLISH_MARKERS,
        );

    const providerLanguage =
        normalizeProviderLanguage(
            input.providerLanguage,
        );

    let candidateLanguage:
        | CallLanguage
        | null = null;

    /*
     * Le résultat Twilio n’est accepté que
     * lorsqu’il est soutenu par la phrase.
     */
    if (
        providerLanguage ===
        "en-US" &&
        englishScore >= 2 &&
        englishScore >
        frenchScore
    ) {
        candidateLanguage =
            "en-US";
    } else if (
        providerLanguage ===
        "fr-CA" &&
        frenchScore >= 2 &&
        frenchScore >
        englishScore
    ) {
        candidateLanguage =
            "fr-CA";
    } else if (
        englishScore >= 3 &&
        englishScore >=
        frenchScore + 2
    ) {
        candidateLanguage =
            "en-US";
    } else if (
        frenchScore >= 3 &&
        frenchScore >=
        englishScore + 2
    ) {
        candidateLanguage =
            "fr-CA";
    }

    if (!candidateLanguage) {
        const containsLanguageMarkers =
            frenchScore > 0 ||
            englishScore > 0;

        return {
            nextState:
                resetCandidate(
                    input.state,
                ),

            shouldSwitch:
                false,

            detectedLanguage:
                null,

            reason:
                containsLanguageMarkers
                    ? "MIXED_SENTENCE"
                    : tokens.length === 0
                        ? "NEUTRAL_TERMS"
                        : "INSUFFICIENT_EVIDENCE",

            frenchScore,
            englishScore,
        };
    }

    if (
        candidateLanguage ===
        input.state.currentLanguage
    ) {
        return {
            nextState:
                resetCandidate(
                    input.state,
                ),

            shouldSwitch:
                false,

            detectedLanguage:
                candidateLanguage,

            reason:
                "CURRENT_LANGUAGE",

            frenchScore,
            englishScore,
        };
    }

    const candidateScore =
        candidateLanguage ===
            "en-US"
            ? englishScore
            : frenchScore;

    const oppositeScore =
        candidateLanguage ===
            "en-US"
            ? frenchScore
            : englishScore;

    /*
     * Une petite phrase ou un mot isolé
     * ne suffit jamais.
     */
    if (
        tokens.length < 4 ||
        candidateScore < 2
    ) {
        return {
            nextState:
                resetCandidate(
                    input.state,
                ),

            shouldSwitch:
                false,

            detectedLanguage:
                candidateLanguage,

            reason:
                "INSUFFICIENT_EVIDENCE",

            frenchScore,
            englishScore,
        };
    }

    /*
     * Une phrase longue et très clairement
     * dans l’autre langue peut déclencher
     * immédiatement le changement.
     */
    const isClearlyDominant =
        tokens.length >= 6 &&
        candidateScore >= 3 &&
        candidateScore >=
        oppositeScore + 2;

    if (isClearlyDominant) {
        return {
            nextState: {
                currentLanguage:
                    candidateLanguage,

                candidateLanguage:
                    null,

                consecutiveCandidateTurns:
                    0,
            },

            shouldSwitch:
                true,

            detectedLanguage:
                candidateLanguage,

            reason:
                "CLEAR_SENTENCE",

            frenchScore,
            englishScore,
        };
    }

    const isSameCandidate =
        input.state
            .candidateLanguage ===
        candidateLanguage;

    const consecutiveCandidateTurns =
        isSameCandidate
            ? input.state
                .consecutiveCandidateTurns +
            1
            : 1;

    if (
        consecutiveCandidateTurns >=
        2
    ) {
        return {
            nextState: {
                currentLanguage:
                    candidateLanguage,

                candidateLanguage:
                    null,

                consecutiveCandidateTurns:
                    0,
            },

            shouldSwitch:
                true,

            detectedLanguage:
                candidateLanguage,

            reason:
                "CONFIRMED_ON_TWO_TURNS",

            frenchScore,
            englishScore,
        };
    }

    return {
        nextState: {
            ...input.state,

            candidateLanguage,

            consecutiveCandidateTurns,
        },

        shouldSwitch:
            false,

        detectedLanguage:
            candidateLanguage,

        reason:
            "INSUFFICIENT_EVIDENCE",

        frenchScore,
        englishScore,
    };
}

export function buildResponseLanguageInstruction(
    language: CallLanguage,
): string {
    if (language === "en-US") {
        return [
            "ACTIVE RESPONSE LANGUAGE: English.",
            "Answer entirely in natural English.",
            "You are fully bilingual in French and English.",
            "English is currently active and fully available.",
            "Never claim that you cannot speak English or that English support is unavailable.",
            "If the customer asks whether you speak English, answer yes naturally.",
            "Do not translate company names, product names, codes or proper nouns.",
            "Ignore any earlier assistant message that incorrectly claimed English was unavailable.",
        ].join("\n");
    }

    return [
        "LANGUE ACTIVE DE LA RÉPONSE : français.",
        "Réponds entièrement dans un français naturel.",
        "Tu es entièrement bilingue en français et en anglais.",
        "Le français est actuellement la langue active.",
        "Ne prétends jamais que l’anglais est indisponible ou que tu ne entièrement dans un français naturel.",
        "Tu es entièrement bilingue en français et en anglais peux pas le parler.",
        "Ne traduis pas les noms d’entreprise, les produits, les codes ou les noms propres.",
        "Ignore toute ancienne réponse de l’agent affirmant incorrectement que l’anglais était indisponible.",
    ].join("\n");
}