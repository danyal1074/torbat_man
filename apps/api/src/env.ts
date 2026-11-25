import { existsSync } from 'node:fs';
import { z } from 'zod';
const bool = z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1');
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Product environment shown to users (banner, OTP echo, demo labels). */
    APP_ENV: z.enum(['development', 'demo', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** When set, connects to a real PostgreSQL server. Otherwise PGlite is used. */
    DATABASE_URL: z.string().optional(),
    PGLITE_DIR: z.string().default('./.data/pglite'),
    SESSION_SECRET: z.string().min(16).default('dev-only-session-secret-change-me'),
    FILE_SIGNING_SECRET: z.string().min(16).default('dev-only-file-secret-change-me'),
    COOKIE_SECURE: bool.optional(),
    /** Comma separated list of browser origins allowed to call the API with cookies. */
    APP_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'),
    OTP_DEV_ECHO: bool.optional(),
    NOBATINO_ENABLED: bool.default(true),
    PUBLIC_DEMO: bool.default(false),
    STORAGE_DIR: z.string().default('./storage'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
    AI_TIMEOUT_MS: z.coerce.number().int().default(8000),
});
export type Env = z.infer<typeof schema> & {
    cookieSecure: boolean;
    otpDevEcho: boolean;
    origins: string[];
};
export function loadEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Env {
    if (source === process.env && existsSync('.env'))
        process.loadEnvFile('.env');
    const parsed = schema.parse(source);
    const isProd = parsed.NODE_ENV === 'production';
    if (parsed.PUBLIC_DEMO && (parsed.APP_ENV !== 'demo' || (isProd && (
        !parsed.DATABASE_URL || new URL(parsed.DATABASE_URL).pathname !== '/torbat_public_demo'
        || !parsed.STORAGE_DIR.endsWith('/public-demo/uploads')
    )))) throw new Error('Public demo requires the dedicated demo database and uploads directory.');
    if (isProd) {
        if (parsed.SESSION_SECRET.startsWith('dev-only') || parsed.FILE_SIGNING_SECRET.startsWith('dev-only')) {
            throw new Error('SESSION_SECRET and FILE_SIGNING_SECRET must be set in production.');
        }
        if (!parsed.DATABASE_URL)
            throw new Error('DATABASE_URL is required in production.');
    }
    return {
        ...parsed,
        cookieSecure: parsed.COOKIE_SECURE ?? isProd,
        // The OTP code is never echoed when APP_ENV=production, whatever the flag says.
        otpDevEcho: !parsed.PUBLIC_DEMO && parsed.APP_ENV !== 'production' && (parsed.OTP_DEV_ECHO ?? !isProd),
        origins: parsed.APP_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    };
}
