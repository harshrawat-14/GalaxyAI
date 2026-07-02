import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";

const IMAGE_URL_RE = new RegExp(`\\.(${ACCEPTED_IMAGE_TYPES.join("|")})$`, "i");

/** A Response/output value counts as an image when it's a URL ending in a known image extension (e.g. the Crop Image node's `output_image`). */
export function isImageUrl(value: unknown): value is string {
  return typeof value === "string" && IMAGE_URL_RE.test(value);
}
