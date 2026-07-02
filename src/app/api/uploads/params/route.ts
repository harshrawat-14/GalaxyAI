import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiError";
import { buildUploadParams } from "@/lib/transloadit";

export async function GET() {
  try {
    await requireUserId();
    return NextResponse.json(buildUploadParams());
  } catch (error) {
    return handleApiError(error);
  }
}
