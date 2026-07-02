import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./apiAuth";

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}
export class ConflictError extends Error {}

/** One place that maps domain/auth errors to HTTP responses, so every route's catch block is identical. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request body", issues: error.issues }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
