import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { PRODUCTION_HOST } from "@/lib/site";
import type { Database } from "@/types/database";

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/join",
  "/terms",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  for (const headerName of ["cache-control", "pragma", "expires"]) {
    const value = from.headers.get(headerName);
    if (value) to.headers.set(headerName, value);
  }
  return to;
}

export async function updateSession(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (host === "my-lokr.vercel.app" || host === "my-lokr.com") {
    const url = request.nextUrl.clone();
    url.hostname = PRODUCTION_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([headerName, headerValue]) => {
            supabaseResponse.headers.set(headerName, String(headerValue));
          });
        }
      },
    },
  });

  // Validate the JWT. Do not use getSession() for authorization.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  let hasLokrPassword: boolean | null = null;
  if (user) {
    const { data, error } = await supabase.rpc("lokr_has_password");
    hasLokrPassword = error ? null : Boolean(data);
  }

  if (user && hasLokrPassword === false && pathname !== "/update-password") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/update-password";
    redirectUrl.search = "";
    return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/lockrs";
    redirectUrl.search = "";
    return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  if (
    user &&
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password")
  ) {
    const next = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    if (next && next.startsWith("/join/")) {
      redirectUrl.pathname = next;
      redirectUrl.search = "";
    } else {
      redirectUrl.pathname = "/lockrs";
      redirectUrl.search = "";
    }
    return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
  }

  return supabaseResponse;
}
