import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// Pure primitives: actual environment values are supplied only by server-only auth.ts.
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 4;
export const LEGACY_JOURNAL_ID = "personal";

/** Journal scopes are fixed legacy storage or canonical generated UUIDs. */
export function isJournalId(value: unknown): value is string {
  return (
    value === LEGACY_JOURNAL_ID ||
    (typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        value,
      ))
  );
}

export type AuthConfiguration = {
  production: boolean;
  password?: string;
  secret?: string;
  databaseUrl?: string;
};

type OriginRequest = {
  origin: string | null;
  requestUrl: string;
  host: string | null;
  forwardedProtocol: string | null;
  configuredOrigin?: string;
};

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Compare against the destination Host, never a reflected Origin/forwarded Host. */
export function isSameOriginRequest(request: OriginRequest): boolean {
  if (!request.origin) return false;
  const origin = canonicalOrigin(request.origin);
  if (!origin) return false;
  if (request.configuredOrigin)
    return origin === canonicalOrigin(request.configuredOrigin);

  try {
    const requestUrl = new URL(request.requestUrl);
    const protocol =
      request.forwardedProtocol === "https" ||
      request.forwardedProtocol === "http"
        ? request.forwardedProtocol
        : requestUrl.protocol.slice(0, -1);
    // Browsers bind Host to the destination. Next may rewrite request.url to
    // localhost internally, including when development was opened via 127.0.0.1.
    const host = request.host ?? requestUrl.host;
    if (/[\s,/@\\?#]/.test(host)) return false;
    const expected = canonicalOrigin(`${protocol}://${host}`);
    return expected !== null && origin === expected;
  } catch {
    return false;
  }
}

export function configurationIssueFor(
  config: AuthConfiguration,
): string | null {
  const requiresAuth =
    config.production ||
    Boolean(config.databaseUrl) ||
    Boolean(config.password);
  if (requiresAuth && !config.password)
    return "Set APP_PASSWORD to protect your private journal.";
  if (requiresAuth && (config.password?.length ?? 0) < MIN_PASSWORD_LENGTH)
    return `APP_PASSWORD must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (requiresAuth && (config.secret?.length ?? 0) < 32)
    return "Set SESSION_SECRET to a random value of at least 32 characters.";
  if (config.production && !config.databaseUrl)
    return "Connect a Neon Postgres database through the Vercel Marketplace and set DATABASE_URL.";
  return null;
}

type Credentials = { password: string; secret: string };

function sessionKey(credentials: Credentials): Buffer {
  if (
    credentials.password.length < MIN_PASSWORD_LENGTH ||
    credentials.secret.length < 32
  ) {
    throw new Error("Session credentials have not been configured.");
  }
  return createHmac("sha256", credentials.secret)
    .update(`pill-happens-session:${credentials.password}`)
    .digest();
}

export function passwordMatchesValue(
  password: string,
  expectedPassword: string,
): boolean {
  if (!expectedPassword) return false;
  const supplied = createHash("sha256").update(password).digest();
  const expected = createHash("sha256").update(expectedPassword).digest();
  return timingSafeEqual(supplied, expected);
}

export function createSessionToken(
  credentials: Credentials,
  now = Date.now(),
): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
      v: 1,
      nonce: randomBytes(16).toString("base64url"),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", sessionKey(credentials))
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  credentials: Credentials,
  now = Date.now(),
): boolean {
  if (token.length > 1024) return false;
  const [payload, signature, extra] = token.split(".");
  if (
    !payload ||
    !signature ||
    extra ||
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  )
    return false;
  try {
    const expected = createHmac("sha256", sessionKey(credentials))
      .update(payload)
      .digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return false;
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!data || typeof data !== "object" || !("exp" in data) || !("v" in data))
      return false;
    const { exp, v } = data;
    const seconds = Math.floor(now / 1000);
    return (
      v === 1 &&
      typeof exp === "number" &&
      Number.isSafeInteger(exp) &&
      exp > seconds &&
      exp <= seconds + SESSION_MAX_AGE + 60
    );
  } catch {
    return false;
  }
}

function journalSessionKey(
  journalId: string,
  credentials: Credentials,
): Buffer {
  if (!isJournalId(journalId) || credentials.secret.length < 32) {
    throw new Error("Journal session credentials have not been configured.");
  }
  // Owner password rotation revokes personal sessions. Other journals retain
  // their own access; every journal is still revoked by signing-secret rotation.
  const key =
    journalId === LEGACY_JOURNAL_ID
      ? sessionKey(credentials)
      : credentials.secret;
  return createHmac("sha256", key)
    .update(`pill-happens-journal-session:v2:${journalId}`)
    .digest();
}

export function createJournalSessionToken(
  journalId: string,
  credentials: Credentials,
  now = Date.now(),
): string {
  const key = journalSessionKey(journalId, credentials);
  const payload = Buffer.from(
    JSON.stringify({
      v: 2,
      journalId,
      exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
      nonce: randomBytes(16).toString("base64url"),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/** Untrusted cookies never choose a journal until their scope is authenticated. */
export function journalFromSessionToken(
  token: string,
  credentials: Credentials,
  now = Date.now(),
): string | null {
  if (token.length > 1024) return null;
  const [payload, signature, extra] = token.split(".");
  if (
    !payload ||
    !signature ||
    extra ||
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  )
    return null;
  try {
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!data || typeof data !== "object" || !("v" in data)) return null;
    if (data.v === 1) {
      return verifySessionToken(token, credentials, now)
        ? LEGACY_JOURNAL_ID
        : null;
    }
    if (
      data.v !== 2 ||
      !("journalId" in data) ||
      !isJournalId(data.journalId) ||
      !("exp" in data) ||
      typeof data.exp !== "number" ||
      !Number.isSafeInteger(data.exp) ||
      !("nonce" in data) ||
      typeof data.nonce !== "string" ||
      !/^[A-Za-z0-9_-]{22}$/.test(data.nonce)
    )
      return null;
    const seconds = Math.floor(now / 1000);
    if (data.exp <= seconds || data.exp > seconds + SESSION_MAX_AGE + 60)
      return null;
    const expected = createHmac(
      "sha256",
      journalSessionKey(data.journalId, credentials),
    )
      .update(payload)
      .digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    return data.journalId;
  } catch {
    return null;
  }
}
