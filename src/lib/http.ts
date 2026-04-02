import { NextResponse } from "next/server";

/** Get the canonical base URL for redirects - uses NEXT_PUBLIC_APP_URL in production */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function redirectWithMessage(url: URL, key: "ok" | "error", message: string) {
  url.searchParams.set(key, message);
  return NextResponse.redirect(url);
}

export function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
