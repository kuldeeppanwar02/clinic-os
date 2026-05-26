import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/api-helpers";
import { verifyPin } from "@/lib/db/pin-auth";
import { createSessionCookie, createStaffSessionToken } from "@/lib/staff-session";
import { getDb } from "@/lib/supabase/db";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_DURATION_MS = 5 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ipStr = forwarded?.split(",")[0] || realIp || cfConnectingIp || "unknown";
  
  // Basic sanitization
  return ipStr.trim().split(":")[0]; // Extract IPv4 cleanly
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSec?: number; remaining?: number }> {
  const sql = getDb();
  const now = new Date();

  // Try to create the table if it doesn't exist (safety fallback)
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        ip_address TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 1,
        first_attempt TIMESTAMPTZ DEFAULT NOW(),
        blocked_until TIMESTAMPTZ
      );
    `;
  } catch (e) {}

  const records = await sql`SELECT * FROM login_attempts WHERE ip_address = ${ip} LIMIT 1`;
  const record = records[0];

  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };

  const blockedUntil = record.blocked_until ? new Date(record.blocked_until) : new Date(0);
  const firstAttempt = new Date(record.first_attempt);

  if (blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
    };
  }

  if (now.getTime() - firstAttempt.getTime() > WINDOW_MS) {
    await sql`DELETE FROM login_attempts WHERE ip_address = ${ip}`;
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    const newBlockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
    await sql`UPDATE login_attempts SET blocked_until = ${newBlockedUntil.toISOString()} WHERE ip_address = ${ip}`;
      
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_DURATION_MS / 1000),
    };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.attempts };
}

async function recordFailedAttempt(ip: string) {
  const sql = getDb();
  const now = new Date().toISOString();
  
  const records = await sql`SELECT attempts FROM login_attempts WHERE ip_address = ${ip} LIMIT 1`;
  const record = records[0];

  if (!record) {
    await sql`INSERT INTO login_attempts (ip_address, attempts, first_attempt) VALUES (${ip}, 1, ${now})`;
  } else {
    await sql`UPDATE login_attempts SET attempts = ${record.attempts + 1} WHERE ip_address = ${ip}`;
  }
}

async function clearAttempts(ip: string) {
  const sql = getDb();
  await sql`DELETE FROM login_attempts WHERE ip_address = ${ip}`;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          message: `Bahut zyada koshishe hui hain. ${rateCheck.retryAfterSec} second baad phir try karein.`,
          retryAfter: rateCheck.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSec),
          },
        },
      );
    }

    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim();

    if (!pin) {
      return NextResponse.json({ message: "PIN is required." }, { status: 400 });
    }

    const result = await verifyPin(pin);

    if (!result) {
      await recordFailedAttempt(ip);
      const remaining = Math.max((rateCheck.remaining ?? MAX_ATTEMPTS) - 1, 0);
      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `Galat PIN. ${remaining} koshishe baaki hain.`
              : "Galat PIN. Kripya 5 minute baad dobara koshish karein.",
          attemptsRemaining: remaining,
        },
        { status: 401 },
      );
    }

    await clearAttempts(ip);

    const sessionToken = createStaffSessionToken({
      id: result.member.id,
      name: result.member.name,
      role: result.member.role,
      designation: result.member.designation,
      clinicAccess: result.member.clinicAccess,
    });

    const response = NextResponse.json({
      success: true,
      sessionToken,
      member: {
        id: result.member.id,
        name: result.member.name,
        role: result.member.role,
        designation: result.member.designation,
        clinicAccess: result.member.clinicAccess,
        status: result.member.status,
      },
    });

    response.headers.append("Set-Cookie", createSessionCookie(sessionToken));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
