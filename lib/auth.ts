import type { AuthToken, SystemRole } from "./types";

const TOKEN_KEY = "scrumflow_token";
const USER_KEY = "scrumflow_user";

export function saveAuth(data: AuthToken) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: data.user_id,
      name: data.name,
      system_role: data.system_role,
    })
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): { id: string; name: string; system_role: SystemRole } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getRole(): SystemRole | null {
  return getUser()?.system_role ?? null;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Returns the home route for a given role after login */
export function homeRouteForRole(role: SystemRole): string {
  switch (role) {
    case "owner":
      return "/owner/dashboard";
    case "colleague":
      return "/workspace";
    case "client":
      return "/portal";
    default:
      return "/auth/login";
  }
}
