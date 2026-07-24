import twilio from "twilio";

const shouldValidateTwilio =
  process.env.NODE_ENV !== "test";

export const validateTwilioWebhook =
  twilio.webhook({
    validate: shouldValidateTwilio,

    /*
     * Twilio contacte notre URL publique en HTTPS.
     * Ngrok termine HTTPS puis transmet la requête
     * localement en HTTP.
     */
    protocol: "https",
  });