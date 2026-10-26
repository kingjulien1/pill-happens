import assert from "node:assert/strict";
import test from "node:test";
import {
  configurationIssueFor,
  createSessionToken,
  isSameOriginRequest,
  passwordMatchesValue,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "./security";

const credentials = {
  password: "a-unique-password-for-tests",
  secret: "a-long-random-secret-for-testing-only-1234567890",
};
const now = Date.parse("2026-10-26T12:00:00Z");

test("origin checks use the actual destination Host when Next internally rewrites the URL", () => {
  const request = {
    origin: "http://127.0.0.1:3000",
    requestUrl: "http://localhost:3000/api/intakes",
    host: "127.0.0.1:3000",
    forwardedProtocol: null,
  };
  assert.equal(isSameOriginRequest(request), true);
  assert.equal(
    isSameOriginRequest({ ...request, origin: "http://localhost:3000" }),
    false,
  );
  assert.equal(
    isSameOriginRequest({ ...request, origin: "https://127.0.0.1:3000" }),
    false,
  );
  assert.equal(
    isSameOriginRequest({ ...request, origin: "http://127.0.0.1:3001" }),
    false,
  );
  assert.equal(
    isSameOriginRequest({ ...request, origin: "https://attacker.example" }),
    false,
  );
});

test("origin checks honor forwarded HTTPS and an explicit deployment origin", () => {
  const request = {
    origin: "https://journal.example",
    requestUrl: "http://localhost:3000/api/intakes",
    host: "journal.example",
    forwardedProtocol: "https",
  };
  assert.equal(isSameOriginRequest(request), true);
  assert.equal(
    isSameOriginRequest({
      ...request,
      origin: "https://attacker.example",
      configuredOrigin: "https://journal.example",
    }),
    false,
  );
  assert.equal(
    isSameOriginRequest({
      ...request,
      host: "internal.example",
      configuredOrigin: "https://journal.example",
    }),
    true,
  );
  assert.equal(
    isSameOriginRequest({
      ...request,
      configuredOrigin: "https://journal.example/path",
    }),
    false,
  );
});

test("origin checks reject absent, opaque, credentialed, malformed and non-origin values", () => {
  const request = {
    origin: "http://localhost:3000",
    requestUrl: "http://localhost:3000/api/intakes",
    host: "localhost:3000",
    forwardedProtocol: null,
  };
  for (const origin of [
    null,
    "null",
    "garbage",
    "http://user@localhost:3000",
    "http://localhost:3000/other",
    "http://localhost:3000?query=1",
  ]) {
    assert.equal(isSameOriginRequest({ ...request, origin }), false);
  }
  for (const host of [
    "attacker.example@localhost:3000",
    "localhost:3000/path",
    "localhost:3000,attacker.example",
    "localhost:3000\\attacker.example",
  ]) {
    assert.equal(isSameOriginRequest({ ...request, host }), false);
  }
});

test("production cannot open without a database, password, and sufficiently long session secret", () => {
  assert.ok(configurationIssueFor({ production: true }));
  assert.ok(configurationIssueFor({ production: true, ...credentials }));
  assert.ok(
    configurationIssueFor({
      production: true,
      ...credentials,
      secret: "short",
      databaseUrl: "configured",
    }),
  );
  assert.ok(
    configurationIssueFor({
      production: true,
      ...credentials,
      password: "abc",
      databaseUrl: "configured",
    }),
  );
  assert.equal(
    configurationIssueFor({
      production: true,
      ...credentials,
      databaseUrl: "configured",
    }),
    null,
  );
});

test("development authentication is required as soon as a real database is connected", () => {
  assert.equal(configurationIssueFor({ production: false }), null);
  assert.ok(
    configurationIssueFor({ production: false, databaseUrl: "configured" }),
  );
  assert.ok(
    configurationIssueFor({
      production: false,
      password: credentials.password,
    }),
  );
  assert.equal(
    configurationIssueFor({ production: false, ...credentials }),
    null,
  );
});

test("password checking handles unequal-length inputs and never accepts an unconfigured password", () => {
  assert.equal(
    passwordMatchesValue(credentials.password, credentials.password),
    true,
  );
  assert.equal(passwordMatchesValue("x", credentials.password), false);
  assert.equal(
    passwordMatchesValue(`${credentials.password}x`, credentials.password),
    false,
  );
  assert.equal(passwordMatchesValue("", ""), false);
});

test("four-character passwords configure and sign sessions while shorter values fail closed", () => {
  const shortCredentials = { ...credentials, password: "4826" };
  assert.equal(
    configurationIssueFor({
      production: true,
      ...shortCredentials,
      databaseUrl: "configured",
    }),
    null,
  );
  assert.equal(passwordMatchesValue("4826", shortCredentials.password), true);
  assert.equal(passwordMatchesValue("4825", shortCredentials.password), false);
  const token = createSessionToken(shortCredentials, now);
  assert.equal(verifySessionToken(token, shortCredentials, now), true);
  assert.equal(
    verifySessionToken(token, { ...shortCredentials, password: "5297" }, now),
    false,
  );
  assert.equal(
    verifySessionToken(
      createSessionToken(credentials, now),
      shortCredentials,
      now,
    ),
    false,
  );
  for (const password of ["", "a", "ab", "abc"]) {
    const invalid = { ...shortCredentials, password };
    assert.ok(
      configurationIssueFor({
        production: true,
        ...invalid,
        databaseUrl: "configured",
      }),
    );
    assert.throws(() => createSessionToken(invalid, now));
  }
  assert.throws(() =>
    createSessionToken({ ...shortCredentials, secret: "short" }, now),
  );
});

test("sessions authenticate, expire exactly at the deadline, and have unique nonces", () => {
  const token = createSessionToken(credentials, now);
  assert.equal(verifySessionToken(token, credentials, now), true);
  assert.equal(
    verifySessionToken(token, credentials, now + SESSION_MAX_AGE * 1000 - 1),
    true,
  );
  assert.equal(
    verifySessionToken(token, credentials, now + SESSION_MAX_AGE * 1000),
    false,
  );
  assert.notEqual(token, createSessionToken(credentials, now));
  assert.equal(
    Buffer.from(token.split(".")[0], "base64url")
      .toString("utf8")
      .includes(credentials.password),
    false,
  );
});

test("tampered, malformed, and unsigned session cookies are rejected without throwing", () => {
  const token = createSessionToken(credentials, now);
  const [payload, signature] = token.split(".");
  const replacement = Buffer.from(
    JSON.stringify({ v: 1, exp: Math.floor(now / 1000) + SESSION_MAX_AGE }),
  ).toString("base64url");
  const cases = [
    "",
    "x",
    "x.x",
    `${payload}.`,
    `${payload}.${signature}.extra`,
    `${replacement}.${signature}`,
    `${payload}.${"a".repeat(43)}`,
    `${payload}.${signature}!`,
    "a".repeat(1025),
  ];
  for (const invalid of cases)
    assert.equal(verifySessionToken(invalid, credentials, now), false);
});

test("changing the password or the signing secret revokes previous sessions", () => {
  const token = createSessionToken(credentials, now);
  assert.equal(
    verifySessionToken(
      token,
      { ...credentials, password: `${credentials.password}-new` },
      now,
    ),
    false,
  );
  assert.equal(
    verifySessionToken(
      token,
      { ...credentials, secret: `${credentials.secret}-new` },
      now,
    ),
    false,
  );
  assert.equal(
    verifySessionToken(token, { password: "", secret: "" }, now),
    false,
  );
  assert.throws(() => createSessionToken({ password: "", secret: "" }, now));
});
