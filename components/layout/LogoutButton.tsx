// This is a standalone logout utility component.
// Import and use it in any page that needs a logout button.

"use client";

import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();

  function logout() {
    clearAuth();
    document.cookie = "scrumflow_token=; path=/; max-age=0";
    router.push("/auth/login");
  }

  return (
    <button
      onClick={logout}
      className="text-xs text-[#5a5a66] hover:text-white transition-colors px-2 py-1"
    >
      Sign out
    </button>
  );
}
