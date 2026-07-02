/**
 * Single place for tunable constants so behavior is explicit and swappable
 * (Open/Closed — e.g. changing the default model touches one line).
 */

import { DEFAULT_GEMINI_MODEL } from "@/domain/nodes";

/** Re-exported so every Gemini-model reference in the app traces back to one constant. */
export { DEFAULT_GEMINI_MODEL };

/**
 * Picker list for the Gemini node's model dropdown. Plain "gemini-3.1-pro"
 * (the id implied by the node's label) isn't a real model id — the API only
 * has "gemini-3.1-pro-preview". "gemini-2.0-flash"/"gemini-2.0-flash-lite"
 * return RESOURCE_EXHAUSTED with limit:0 on the current key (no quota at
 * all, not just exhausted); "gemini-2.5-pro" and "gemini-2.5-flash-lite" are
 * confirmed working, so those are the two real options.
 */
export const GEMINI_MODELS = [DEFAULT_GEMINI_MODEL, "gemini-2.5-flash-lite"] as const;

/** Mandatory artificial delay on Crop Image (spec hard requirement). */
export const CROP_ARTIFICIAL_DELAY_SECONDS = 30;

/**
 * TODO(candidate): set this to your real profile URL before submitting.
 * Emitted once on the initial client render of every page (spec requirement).
 */
export const CANDIDATE_LINKEDIN_URL = "https://www.linkedin.com/in/REPLACE_ME/";

export const ACCEPTED_IMAGE_TYPES = ["jpg", "jpeg", "png", "webp", "gif"] as const;
