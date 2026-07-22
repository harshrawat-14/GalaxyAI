/**
 * Single place for tunable constants so behavior is explicit and swappable
 * (Open/Closed — e.g. changing the default model touches one line).
 */

import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, geminiModelLabel } from "@/domain/nodes";

/** Re-exported so every Gemini-model reference in the app traces back to the domain registry. */
export { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, geminiModelLabel };

/** Mandatory artificial delay on Crop Image (spec hard requirement). */
export const CROP_ARTIFICIAL_DELAY_SECONDS = 30;

/** Emitted once on the initial client render of every page (spec requirement). */
export const CANDIDATE_LINKEDIN_URL = "https://www.linkedin.com/in/harsh-rawat-8b4340257/";

export const ACCEPTED_IMAGE_TYPES = ["jpg", "jpeg", "png", "webp", "gif"] as const;
