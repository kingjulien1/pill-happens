import { ApiError } from "./api-error";

/** Byte limits concern JSON transport, separately from each schema's text cap. */
export const JSON_BODY_LIMITS = {
  default: 16_384,
  dailyCheckIn: 65_536,
} as const;

export type JsonBodyOptions = { maxBytes?: number };

export async function jsonBody(
  request: Request,
  { maxBytes = JSON_BODY_LIMITS.default }: JsonBodyOptions = {},
): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
    throw new RangeError("The JSON body limit must be a positive byte count.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send this request as JSON.");
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes)
    throw new ApiError(413, "This entry is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes)
    throw new ApiError(413, "This entry is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "The submitted data could not be read.");
  }
}
