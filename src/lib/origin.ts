export function isAllowedOrigin(
  origin: string | null,
  configured: string,
  development = false,
) {
  if (!origin) return false;
  try {
    const actual = new URL(origin);
    const expected = new URL(configured);
    if (actual.origin === expected.origin) return true;
    const loopback = new Set(["localhost", "127.0.0.1"]);
    return (
      development &&
      loopback.has(actual.hostname) &&
      loopback.has(expected.hostname) &&
      actual.protocol === expected.protocol &&
      actual.port === expected.port
    );
  } catch {
    return false;
  }
}
