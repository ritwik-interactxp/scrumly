import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't need auth
const PUBLIC_ROUTES = ["/auth/login", "/auth/accept-invite"];

// Route prefix → allowed roles
const ROLE_MAP: Record<string, string[]> = {
  "/owner": ["owner"],
  "/workspace": ["colleague"],
  "/portal": ["client", "owner"],   // owner can preview portal
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Get token from cookie (we'll set it as a cookie on login too)
  const token = request.cookies.get("scrumflow_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Decode JWT payload (no verification here — FastAPI verifies on API calls)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role: string = payload.role;

    for (const [prefix, allowedRoles] of Object.entries(ROLE_MAP)) {
      if (pathname.startsWith(prefix)) {
        if (!allowedRoles.includes(role)) {
          // Redirect to their correct home
          const redirectMap: Record<string, string> = {
            owner: "/owner/dashboard",
            colleague: "/workspace",
            client: "/portal",
          };
          return NextResponse.redirect(
            new URL(redirectMap[role] || "/auth/login", request.url)
          );
        }
      }
    }
  } catch {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/workspace/:path*", "/portal/:path*"],
};
