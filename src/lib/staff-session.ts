import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { ClinicId } from "@/features/clinic/types";
import type { StaffRole } from "@/lib/db/pin-auth";
import { serverEnv } from "@/config/server-env";

export const STAFF_SESSION_COOKIE = "panwar_staff_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type StaffSessionClaims = {
  sub: string;
  name: string;
  role: StaffRole;
  designation: string;
  clinicAccess: ClinicId[];
  iat: number;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const normalized = remainder === 0 ? padded : `${padded}${"=".repeat(4 - remainder)}`;
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getSessionSecret() {
  const secret = serverEnv.staffSessionSecret;

  if (!secret) {
    throw new Error(
      "Staff session secret missing. Add STAFF_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return secret;
}

function sign(unsignedToken: string) {
  return createHmac("sha256", getSessionSecret())
    .update(unsignedToken)
    .digest("base64url");
}

export function createStaffSessionToken(input: {
  id: string;
  name: string;
  role: StaffRole;
  designation: string;
  clinicAccess: ClinicId[];
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: StaffSessionClaims = {
    sub: input.id,
    name: input.name,
    role: input.role,
    designation: input.designation,
    clinicAccess: input.clinicAccess,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${header}.${encodedPayload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyStaffSessionToken(token: string): StaffSessionClaims {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new Error("Invalid session token.");
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = sign(unsignedToken);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Session signature mismatch.");
  }

  const claims = JSON.parse(base64UrlDecode(payload)) as StaffSessionClaims;

  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Session expired.");
  }

  return claims;
}

export function createSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${STAFF_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STAFF_SESSION_COOKIE}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(STAFF_SESSION_COOKIE.length + 1));
}
