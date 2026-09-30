import 'dotenv/config';

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

function port(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback;
}

/** Typed, validated application configuration. Fail fast on real misconfiguration. */
export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: port('PORT', 5000),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),

  jwt: {
    secret: optional('JWT_SECRET', 'dev-only-insecure-secret'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-only-insecure-refresh-secret'),
  },

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
} as const;
