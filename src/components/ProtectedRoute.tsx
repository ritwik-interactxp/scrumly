import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, getRole } from "../lib/auth";
import type { SystemRole } from "../lib/types";

interface Props {
  children: React.ReactNode;
  allowedRoles: SystemRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const location = useLocation();
  if (!isAuthenticated()) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  const role = getRole();
  if (!role || !allowedRoles.includes(role)) {
    const redirectMap: Record<SystemRole, string> = {
      owner: "/owner/dashboard",
      colleague: "/workspace",
      client: "/portal",
    };
    return <Navigate to={redirectMap[role as SystemRole] || "/auth/login"} replace />;
  }
  return <>{children}</>;
}
