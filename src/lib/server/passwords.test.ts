import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  hashPassword,
  passwordBodySchema,
  passwordSchema,
  verifyPassword,
} from "./passwords";

test("password bounds match input length and preserve exact spaces and Unicode", () => {
  for (const password of [
    "4826",
    "    ",
    " 🩷 ",
    "🩷🩷",
    "éééé",
    "a".repeat(1024),
  ]) {
    assert.equal(passwordSchema.parse(password), password);
    assert.equal(passwordBodySchema.parse({ password }).password, password);
  }
  for (const password of ["", "123", "🩷", "a".repeat(1025), "test\ud800"]) {
    assert.equal(passwordSchema.safeParse(password).success, false);
  }
  for (const password of [undefined, null, 4826, {}, []])
    assert.equal(passwordBodySchema.safeParse({ password }).success, false);
});

test("stored password verifiers use independent salts and slow scrypt hashes", async () => {
  const password = "  exact-🩷-password  ";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.equal(first.scheme, "scrypt-v1");
  assert.equal(Buffer.from(first.salt, "base64url").length, 16);
  assert.equal(Buffer.from(first.hash, "base64url").length, 64);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(JSON.stringify(first).includes(password), false);
  assert.notEqual(
    first.hash,
    createHash("sha256").update(password).digest("base64url"),
  );
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
  for (const wrong of [
    password.trim(),
    password.toUpperCase(),
    `${password} `,
    "different-password",
  ])
    assert.equal(await verifyPassword(wrong, first), false);
});

test("Unicode normalization never makes different passwords equivalent", async () => {
  const decomposed = "cafe\u0301";
  const composed = decomposed.normalize("NFC");
  assert.notEqual(composed, decomposed);
  const verifier = await hashPassword(decomposed);
  assert.equal(await verifyPassword(decomposed, verifier), true);
  assert.equal(await verifyPassword(composed, verifier), false);
});

test("malformed or noncanonical stored verifiers fail closed", async () => {
  const verifier = await hashPassword("a-private-test-password");
  for (const invalid of [
    { ...verifier, scheme: "unknown" as typeof verifier.scheme },
    { ...verifier, salt: "too-short" },
    { ...verifier, hash: "too-short" },
    { ...verifier, hash: `${verifier.hash}==` },
    { ...verifier, salt: "A".repeat(21) + "B" },
    { ...verifier, hash: "A".repeat(85) + "B" },
  ])
    assert.equal(
      await verifyPassword("a-private-test-password", invalid),
      false,
    );
  assert.equal(await verifyPassword("abc", verifier), false);
  await assert.rejects(hashPassword("abc"));
});
