import { z } from "zod";

/**
 * Centralized, validated environment access. Server secrets are read lazily so
 * the client bundle never pulls them in; missing required vars fail loudly at
 * boot rather than as a confusing runtime error deep in a Trigger.dev task.
 *
 * The raw process.env var names here are this deployment's own (.env /
 * .env.local) — they're remapped to the field names the domain/lib/trigger
 * code reads (GOOGLE_AI_API_KEY, TRANSLOADIT_AUTH_KEY, etc.) so that code
 * doesn't need to know which literal env var name backs it.
 */

const rawSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  TRANSLOADIT_KEY: z.string().min(1),
  TRANSLOADIT_SECRET: z.string().min(1),
  APP_URL: z.string().url(),
});

export interface ServerEnv {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  GOOGLE_AI_API_KEY: string;
  TRANSLOADIT_AUTH_KEY: string;
  TRANSLOADIT_AUTH_SECRET: string;
  APP_URL: string;
}

let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = rawSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid/missing server environment variables: ${missing}`);
  }
  const raw = parsed.data;
  cachedServerEnv = {
    DATABASE_URL: raw.DATABASE_URL,
    CLERK_SECRET_KEY: raw.CLERK_SECRET_KEY,
    GOOGLE_AI_API_KEY: raw.GEMINI_API_KEY,
    TRANSLOADIT_AUTH_KEY: raw.TRANSLOADIT_KEY,
    TRANSLOADIT_AUTH_SECRET: raw.TRANSLOADIT_SECRET,
    APP_URL: raw.APP_URL,
  };
  return cachedServerEnv;
}

/** Public vars are inlined by Next at build time; validated shape only. */
export const publicEnv = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
};
