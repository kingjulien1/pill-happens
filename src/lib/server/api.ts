import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { configurationReady, isAuthenticated } from "@/lib/server/auth";
import { isSameOriginRequest } from "@/lib/server/security";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function checkOrigin(request: Request) {
  if (!isSameOriginRequest({
    origin: request.headers.get("origin"),
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedProtocol: request.headers.get("x-forwarded-proto"),
    configuredOrigin: process.env.APP_ORIGIN,
  })) throw new ApiError(403, "This request must come from your journal.");
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "Send this request as JSON.");
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 16_384) throw new ApiError(413, "This entry is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 16_384) throw new ApiError(413, "This entry is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "The submitted data could not be read.");
  }
}

export async function api(
  request: Request,
  handler: () => Promise<unknown>,
  options: { public?: boolean; mutation?: boolean } = {},
): Promise<Response> {
  try {
    if (!configurationReady()) throw new ApiError(503, "Your private journal is not configured yet. Check the server environment settings.");
    if (options.mutation) checkOrigin(request);
    if (!options.public && !(await isAuthenticated())) throw new ApiError(401, "Please sign in to open your journal.");
    const result = await handler();
    if (result instanceof Response) return result;
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    let status = 500;
    let message = "Your data could not be saved or loaded. Please try again.";
    if (error instanceof ApiError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 400;
      message = error.issues[0]?.message || "Please check the submitted fields.";
    } else {
      // Deliberately omit database errors and connection details from both the response and logs.
      console.error("Journal API request failed", { name: error instanceof Error ? error.name : "UnknownError" });
    }
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
