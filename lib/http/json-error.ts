import { NextResponse } from "next/server";

export function jsonError(
  status: number,
  code: string,
  message: string,
  options?: { retryAfterSec?: number }
) {
  const headers = new Headers();
  if (options?.retryAfterSec) {
    headers.set("Retry-After", String(options.retryAfterSec));
  }
  return NextResponse.json({ success: false, code, message }, { status, headers });
}
