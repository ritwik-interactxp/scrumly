import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, getRole, homeRouteForRole } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import AcceptInvitePage from "./pages/auth/AcceptInvitePage";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import ProjectDetailPage from "./pages/owner/ProjectDetailPage";
import WorkspaceHome from "./pages/workspace/WorkspaceHome";
import WorkspacePage from "./pages/workspace/WorkspacePage";
import PortalHome from "./pages/portal/PortalHome";
import PortalPage from "./pages/portal/PortalPage";
import PublicPortalPage from "./pages/portal/PublicPortalPage";
import SettingsPage from "./pages/settings/SettingsPage";

function RootRedirect() {
  if (!isAuthenticated()) return <Navigate to="/auth/login" replace />;
  const role = getRole();
  return <Navigate to={role ? homeRouteForRole(role) : "/auth/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />

      {/* ── Public portal — no login required ── */}
      <Route path="/p/:shareToken" element={<PublicPortalPage />} />

      {/* ── Owner ── */}
      <Route path="/owner/dashboard" element={
        <ProtectedRoute allowedRoles={["owner"]}><OwnerDashboard /></ProtectedRoute>
      } />
      <Route path="/owner/dashboard/:projectId" element={
        <ProtectedRoute allowedRoles={["owner"]}><ProjectDetailPage /></ProtectedRoute>
      } />

      {/* ── Settings (owner only) ── */}
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={["owner"]}><SettingsPage /></ProtectedRoute>
      } />

      {/* ── Workspace (colleagues) ── */}
      <Route path="/workspace" element={
        <ProtectedRoute allowedRoles={["colleague"]}><WorkspaceHome /></ProtectedRoute>
      } />
      <Route path="/workspace/:projectId" element={
        <ProtectedRoute allowedRoles={["colleague"]}><WorkspacePage /></ProtectedRoute>
      } />

      {/* ── Authenticated portal (owner preview / old client login flow) ── */}
      <Route path="/portal" element={
        <ProtectedRoute allowedRoles={["client", "owner"]}><PortalHome /></ProtectedRoute>
      } />
      <Route path="/portal/:projectId" element={
        <ProtectedRoute allowedRoles={["client", "owner"]}><PortalPage /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
