import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.warn("[csp-report]", body.slice(0, 2000));
  } catch {
    // ignorar
  }
  return new NextResponse(null, { status: 204 });
}
