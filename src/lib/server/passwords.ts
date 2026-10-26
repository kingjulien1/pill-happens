import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./security";

export const MAX_PASSWORD_LENGTH = 1024;
export { MIN_PASSWORD_LENGTH } from "./security";
export const PASSWORD_SCHEME = "scrypt-v1" as const;

/** Match native input length bounds; preserve exact Unicode, spaces and case. */
export const passwordSchema = z
  .string()
  // Zod's string min/max count code points; native inputs and the login form
  // use UTF-16 units. Explicit length checks keep both validation paths equal.
  .refine(
    (value) => value.length >= MIN_PASSWORD_LENGTH,
    "Use a password with at least 4 characters.",
  )
  .refine(
    (value) => value.length <= MAX_PASSWORD_LENGTH,
    "Keep your password under 1,025 characters.",
  )
  .refine(
    (value) => value.isWellFormed(),
    "Use a password with valid Unicode characters.",
  );
export const passwordBodySchema = z.object({ password: passwordSchema });

export type PasswordVerifier = {
  scheme: typeof PASSWORD_SCHEME;
  salt: string;
  hash: string;
};

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(
  password: string,
): Promise<PasswordVerifier> {
  passwordSchema.parse(password);
  const salt = randomBytes(16);
  return {
    scheme: PASSWORD_SCHEME,
    salt: salt.toString("base64url"),
    hash: (await derive(password, salt)).toString("base64url"),
  };
}

export async function verifyPassword(
  password: string,
  verifier: PasswordVerifier,
): Promise<boolean> {
  if (
    !passwordSchema.safeParse(password).success ||
    verifier.scheme !== PASSWORD_SCHEME ||
    !/^[A-Za-z0-9_-]{22}$/.test(verifier.salt) ||
    !/^[A-Za-z0-9_-]{86}$/.test(verifier.hash)
  )
    return false;
  const expected = Buffer.from(verifier.hash, "base64url");
  const salt = Buffer.from(verifier.salt, "base64url");
  // Reject noncanonical encodings rather than accepting equivalent hash strings.
  if (
    salt.toString("base64url") !== verifier.salt ||
    expected.toString("base64url") !== verifier.hash
  )
    return false;
  return timingSafeEqual(await derive(password, salt), expected);
}
