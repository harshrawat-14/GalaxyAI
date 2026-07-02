import { type NextRequest, NextResponse } from "next/server";
import { wait } from "@trigger.dev/sdk";
import { firstResultUrl, verifyWebhookSignature, type TransloaditWebhookResult } from "@/lib/transloadit";

/**
 * Transloadit's completion callback (`notify_url`, set per-assembly in
 * crop.task.ts) — completes the Trigger.dev wait token the crop task is
 * suspended on, instead of the task polling Transloadit's assembly-status
 * endpoint itself. Unauthenticated by Clerk (it's called by Transloadit, not
 * a signed-in user) — trust comes from the HMAC signature Transloadit sends
 * with every notification, verified below before completing anything.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const form = await req.formData();
  const rawTransloaditField = form.get("transloadit");
  const signature = form.get("signature");
  if (typeof rawTransloaditField !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "Malformed webhook body" }, { status: 400 });
  }

  if (!verifyWebhookSignature(rawTransloaditField, signature)) {
    console.error("[transloadit webhook] signature verification failed — rejecting notification");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const assembly = JSON.parse(rawTransloaditField);
  const result = buildWebhookResult(assembly);
  await wait.completeToken(token, result);
  return NextResponse.json({ ok: true });
}

/** Never throws — an unexpected assembly shape becomes an `{error}` result (so the
 * waiting crop task fails with a clear message) instead of a 500 that leaves it hanging. */
function buildWebhookResult(assembly: { ok?: string; error?: string; results?: Parameters<typeof firstResultUrl>[0] }): TransloaditWebhookResult {
  if (assembly.ok !== "ASSEMBLY_COMPLETED") {
    return { error: assembly.error ?? `Unexpected assembly status: ${assembly.ok}` };
  }
  try {
    return { url: firstResultUrl(assembly.results ?? {}) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
