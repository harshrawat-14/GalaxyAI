import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";

const ASSEMBLIES_URL = "https://api2.transloadit.com/assemblies";

export class UnsupportedImageTypeError extends Error {
  constructor(filename: string) {
    super(`"${filename}" isn't an accepted image type (${ACCEPTED_IMAGE_TYPES.join(", ")}).`);
    this.name = "UnsupportedImageTypeError";
  }
}

function hasAcceptedExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return Boolean(ext && (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(ext));
}

function firstResultUrl(results: Record<string, Array<{ ssl_url?: string; url?: string }>>): string {
  for (const files of Object.values(results)) {
    const url = files[0]?.ssl_url ?? files[0]?.url;
    if (url) return url;
  }
  throw new Error("Transloadit assembly completed with no output file");
}

async function pollAssembly(statusUrl: string, attempt = 0): Promise<string> {
  if (attempt > 30) throw new Error("Transloadit assembly timed out");
  const res = await fetch(statusUrl);
  const assembly = await res.json();

  if (assembly.ok === "ASSEMBLY_COMPLETED") return firstResultUrl(assembly.results);
  if (assembly.error) throw new Error(`Upload failed: ${assembly.error}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  return pollAssembly(statusUrl, attempt + 1);
}

/**
 * Uploads an image file from the browser straight to Transloadit, using
 * signed params fetched from our own API (the secret never reaches the
 * client — see GET /api/uploads/params, lib/transloadit.ts). Returns the
 * resulting CDN URL.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!hasAcceptedExtension(file.name)) {
    throw new UnsupportedImageTypeError(file.name);
  }

  const paramsRes = await fetch("/api/uploads/params");
  if (!paramsRes.ok) throw new Error("Failed to get upload params");
  const { params, signature } = await paramsRes.json();

  const form = new FormData();
  form.set("params", params);
  form.set("signature", signature);
  form.set("file", file, file.name);

  const created = await fetch(ASSEMBLIES_URL, { method: "POST", body: form });
  if (!created.ok) throw new Error(`Upload failed: ${created.status} ${await created.text()}`);
  const assembly = await created.json();

  return pollAssembly(assembly.assembly_ssl_url ?? assembly.assembly_url);
}
