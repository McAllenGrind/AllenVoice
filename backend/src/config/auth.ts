const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error(
    "La variable d'environnement JWT_SECRET est obligatoire.",
  );
}

const parsedExpiration = Number(
  process.env.JWT_EXPIRES_IN_SECONDS ?? 7200,
);

export const authConfig = {
  jwtSecret,
  jwtExpiresInSeconds:
    Number.isFinite(parsedExpiration) && parsedExpiration > 0
      ? parsedExpiration
      : 7200,
};