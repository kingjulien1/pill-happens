import { randomBytes } from "node:crypto";

// These are shown only in your terminal. Copy them into your private environment.
console.log(`APP_PASSWORD=${randomBytes(24).toString("base64url")}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
