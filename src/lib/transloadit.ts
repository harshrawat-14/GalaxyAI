import { createHmac } from "node:crypto";
import { serverEnv } from "@/env";

const ASSEMBLIES_URL = "https://api2.transloadit.com/assemblies";

/** What `/api/transloadit/webhook` completes a wait token with — read back by `crop.task.ts`. */
export type TransloaditWebhookResult = { url: string } | { error: string };

/**
 * Signed params for Transloadit's Signature Authentication (current scheme:
 * HMAC-SHA384 over the JSON params, hex-encoded, prefixed "sha384:"). The
 * secret never reaches the browser — only the resulting `{params, signature}`
 * pair does, used by the client uploader and by server-side uploads alike.
 */
function signParams(params: Record<string, unknown>): { params: string; signature: string } {
  const json = JSON.stringify(params);
  const hash = createHmac("sha384", serverEnv().TRANSLOADIT_AUTH_SECRET).update(json).digest("hex");
  return { params: json, signature: `sha384:${hash}` };
}

/**
 * Steps defined inline (not a dashboard template) so the upload pipeline is
 * one source of truth in code: `/upload/handle` just stores the file as-is.
 * `result: true` is required — `:original` is Transloadit's implicit
 * raw-upload step and is *not* included in `results` by default, only when
 * explicitly marked (confirmed: an assembly without it completes with
 * `results: {}`, which silently breaks every upload).
 */
const PASS_THROUGH_STEPS = { ":original": { robot: "/upload/handle", result: true } };

/** Signed params for a direct browser upload (`image_field` picker, LLD §7 `/uploads/params`). */
export function buildUploadParams(): { params: string; signature: string } {
  const env = serverEnv();
  return signParams({
    auth: { key: env.TRANSLOADIT_AUTH_KEY, expires: expiresInMinutes(60) },
    steps: PASS_THROUGH_STEPS,
  });
}

function expiresInMinutes(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  // Transloadit expects "YYYY/MM/DD HH:mm:ss+00:00" (UTC).
  return d.toISOString().slice(0, 19).replace("T", " ").replace(/-/g, "/") + "+00:00";
}

/** First file URL found anywhere in an assembly's `results` map. */
export function firstResultUrl(results: Record<string, Array<{ ssl_url?: string; url?: string }>>): string {
  for (const files of Object.values(results)) {
    const file = files[0];
    const url = file?.ssl_url ?? file?.url;
    if (url) return url;
  }
  throw new Error("Transloadit assembly completed with no output file");
}

/**
 * Starts a server-side upload of the FFmpeg crop output (LLD §5.1 step 5),
 * with Transloadit notified at `notifyUrl` on completion instead of being
 * polled — `crop.task.ts` pairs this with a Trigger.dev wait token (native
 * checkpoint/restore wait) and `/api/transloadit/webhook` completes that
 * token once Transloadit's callback arrives, so the task suspends instead of
 * burning compute re-checking assembly status every second.
 */
export async function startTransloaditUpload(buffer: Buffer, filename: string, notifyUrl: string): Promise<void> {
  const { params, signature } = signParams({
    auth: { key: serverEnv().TRANSLOADIT_AUTH_KEY, expires: expiresInMinutes(10) },
    steps: PASS_THROUGH_STEPS,
    notify_url: notifyUrl,
  });

  const form = new FormData();
  form.set("params", params);
  form.set("signature", signature);
  form.set("file", new Blob([new Uint8Array(buffer)]), filename);

  const created = await fetch(ASSEMBLIES_URL, { method: "POST", body: form });
  if (!created.ok) {
    throw new Error(`Transloadit assembly creation failed: ${created.status} ${await created.text()}`);
  }
}

/**
 * Verifies Transloadit's webhook notification signature.
 *
 * This is NOT the same scheme as `signParams`/`buildUploadParams` above.
 * Those use Signature Auth (HMAC-SHA384, hex, prefixed "sha384:") to
 * authenticate an outgoing request *to* Transloadit's API. The webhook
 * notification Transloadit itself sends back to `notify_url` is signed with
 * their separate, legacy scheme: plain HMAC-SHA1 over the raw `transloadit`
 * field, hex-encoded, with no algorithm prefix — confirmed by inspecting a
 * real webhook payload in production (received signature was exactly 40 hex
 * chars, i.e. SHA-1 length, not the 103-char "sha384:<hex>" we were
 * comparing against, so every real webhook failed verification with a 401).
 */
export function computeExpectedSignature(rawTransloaditField: string): string {
  return createHmac("sha1", serverEnv().TRANSLOADIT_AUTH_SECRET).update(rawTransloaditField).digest("hex");
}

export function verifyWebhookSignature(rawTransloaditField: string, signature: string): boolean {
  return computeExpectedSignature(rawTransloaditField) === signature;
}
