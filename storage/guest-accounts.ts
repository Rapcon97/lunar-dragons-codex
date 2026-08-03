import { env } from "cloudflare:workers";

// Cloudflare Workers caps Web Crypto PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS = 100_000;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MILLISECONDS = 15 * 60 * 1000;
const encoder = new TextEncoder();

export type GuestAccount = {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number | null;
};

type GuestAccountRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  failed_attempts: number;
  locked_until: number | null;
  is_active: number;
  created_at: number;
  last_login_at: number | null;
};

function bindings() {
  return env as unknown as {
    DB?: D1Database;
    GUEST_SESSION_SECRET?: string;
  };
}

function database() {
  const db = bindings().DB;
  if (!db) throw new Error("Guest account database is unavailable.");
  return db;
}

function sessionSecret() {
  const secret = bindings().GUEST_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Guest session security is unavailable.");
  }
  return secret;
}

export function normalizeGuestUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function ensureGuestAccountsTable() {
  const db = database();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS guest_users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER
      )`,
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS guest_users_active_idx ON guest_users (is_active, username)",
    )
    .run();
}

function publicAccount(row: GuestAccountRow): GuestAccount {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) {
    throw new Error("Invalid encoded value.");
  }
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

function randomHex(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToHex(bytes);
}

async function hashPassphrase(passphrase: string, saltHex: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function listGuestAccounts() {
  await ensureGuestAccountsTable();
  const result = await database()
    .prepare(
      `SELECT id, username, display_name, password_hash, password_salt,
        failed_attempts, locked_until, is_active, created_at, last_login_at
       FROM guest_users WHERE is_active = 1 ORDER BY created_at DESC`,
    )
    .all<GuestAccountRow>();
  return result.results.map(publicAccount);
}

export async function createGuestAccount(
  username: string,
  displayName: string,
  passphrase: string,
) {
  await ensureGuestAccountsTable();
  const normalizedUsername = normalizeGuestUsername(username);
  const salt = randomHex(16);
  const passwordHash = await hashPassphrase(passphrase, salt);
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  try {
    await database()
      .prepare(
        `INSERT INTO guest_users
          (id, username, display_name, password_hash, password_salt, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, normalizedUsername, displayName.trim(), passwordHash, salt, createdAt)
      .run();
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      throw new Error("GUEST_USERNAME_TAKEN");
    }
    throw error;
  }

  return { id, username: normalizedUsername, displayName: displayName.trim(), createdAt, lastLoginAt: null };
}

export async function deleteGuestAccount(id: string) {
  await ensureGuestAccountsTable();
  await database().prepare("DELETE FROM guest_users WHERE id = ?").bind(id).run();
}

export async function verifyGuestCredentials(username: string, passphrase: string) {
  await ensureGuestAccountsTable();
  const normalizedUsername = normalizeGuestUsername(username);
  const row = await database()
    .prepare(
      `SELECT id, username, display_name, password_hash, password_salt,
        failed_attempts, locked_until, is_active, created_at, last_login_at
       FROM guest_users WHERE username = ?`,
    )
    .bind(normalizedUsername)
    .first<GuestAccountRow>();

  if (!row) {
    await hashPassphrase(passphrase, "00000000000000000000000000000000");
    return null;
  }

  const candidate = await hashPassphrase(passphrase, row.password_salt);
  const now = Date.now();
  const isLocked = Boolean(row.locked_until && row.locked_until > now);
  const isValid = Boolean(row.is_active) && !isLocked && safeEqual(candidate, row.password_hash);

  if (!isValid) {
    const failedAttempts = row.failed_attempts + 1;
    const lockedUntil =
      failedAttempts >= LOCKOUT_ATTEMPTS ? now + LOCKOUT_MILLISECONDS : row.locked_until;
    await database()
      .prepare("UPDATE guest_users SET failed_attempts = ?, locked_until = ? WHERE id = ?")
      .bind(failedAttempts, lockedUntil, row.id)
      .run();
    return null;
  }

  await database()
    .prepare(
      "UPDATE guest_users SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?",
    )
    .bind(now, row.id)
    .run();
  return publicAccount({ ...row, failed_attempts: 0, locked_until: null, last_login_at: now });
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function createGuestSessionToken(account: GuestAccount) {
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        id: account.id,
        exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
      }),
    ),
  );
  const signature = base64UrlEncode(await hmac(payload));
  return `${payload}.${signature}`;
}

export async function readGuestSessionToken(token: string) {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expectedSignature = base64UrlEncode(await hmac(payload));
    if (!safeEqual(signature, expectedSignature)) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as {
      id?: string;
      exp?: number;
    };
    if (!parsed.id || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;

    await ensureGuestAccountsTable();
    const row = await database()
      .prepare(
        `SELECT id, username, display_name, password_hash, password_salt,
          failed_attempts, locked_until, is_active, created_at, last_login_at
         FROM guest_users WHERE id = ? AND is_active = 1`,
      )
      .bind(parsed.id)
      .first<GuestAccountRow>();
    return row ? publicAccount(row) : null;
  } catch {
    return null;
  }
}

export const guestSessionMaxAge = SESSION_SECONDS;
