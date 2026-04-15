"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole, isAuthenticated, homeRouteForRole } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    const role = getRole();
    if (role) {
      router.replace(homeRouteForRole(role));
    } else {
      router.replace("/auth/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
      <p className="text-[#5a5a66] text-sm">Redirecting...</p>
    </div>
  );
}
