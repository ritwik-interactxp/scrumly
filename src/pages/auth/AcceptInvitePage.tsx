import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../lib/api";
import { saveAuth, homeRouteForRole } from "../../lib/auth";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      const data = await authApi.acceptInvite(token, name, password);
      saveAuth(data);
      navigate(homeRouteForRole(data.system_role), { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid or expired invite link");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#7c6aff] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Scrumly</span>
          </div>
          <p className="text-[#5a5a66] text-sm">You've been invited — set up your account</p>
        </div>
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6">
          {!token ? (
            <p className="text-red-400 text-sm text-center">Invalid invite link. Please ask for a new one.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#8a8a99] mb-1.5">Your name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name"
                  className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-[#8a8a99] mb-1.5">Set password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                  className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-[#8a8a99] mb-1.5">Confirm password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••"
                  className="w-full bg-[#0d0d0f] border border-[#1e1e24] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#3a3a44] focus:outline-none focus:border-[#7c6aff] transition-colors" />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-[#7c6aff] hover:bg-[#6b59ee] disabled:opacity-50 text-white font-medium text-sm rounded-lg py-2.5 transition-colors">
                {loading ? "Setting up..." : "Activate account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
