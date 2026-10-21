export function getExpirationWindowSeconds(environment: NodeJS.ProcessEnv = process.env): number {
  const value = environment.ORDER_EXPIRATION_SECONDS;
  const seconds = value === undefined ? 15 * 60 : Number(value);

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('ORDER_EXPIRATION_SECONDS must be a positive integer');
  }

  return seconds;
}