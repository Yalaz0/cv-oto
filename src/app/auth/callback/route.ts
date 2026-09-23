import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const client = await createClient();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const destination =
    request.nextUrl.searchParams.get("next") === "/update-password"
      ? "/update-password"
      : "/dashboard";
  if (tokenHash && (type === "signup" || type === "recovery")) {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "recovery" ? "/update-password" : "/dashboard",
          request.url,
        ),
      );
  } else if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  return NextResponse.redirect(new URL("/verify?error=expired", request.url));
}
