import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/staff-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
