import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path || !path.startsWith("/guest/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Use configured public URL so generated QR works behind reverse proxies.
  const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const fullUrl = `${origin}${path}`;

  const svg = await QRCode.toString(fullUrl, {
    type: "svg",
    margin: 2,
    width: 256,
    color: { dark: "#1e293b", light: "#ffffff" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
