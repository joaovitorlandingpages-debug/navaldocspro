import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Key, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/debug/auth")({
  component: AuthDebugPage,
});

function AuthDebugPage() {
  const { user, profile, loading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
  }, []);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
          <Shield className="h-8 w-8" /> Auth Diagnostics
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400">
                <Key className="h-4 w-4" /> Session State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                {sessionLoading ? (
                  <p className="text-amber-400">Loading...</p>
                ) : session ? (
                  <p className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </p>
                ) : (
                  <p className="text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> No Session
                  </p>
                )}
              </div>
              {session && (
                <>
                  <div>
                    <p className="text-xs text-slate-500">User ID</p>
                    <p className="text-xs break-all">{session.user.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Expires At</p>
                    <p className="text-xs">{new Date(session.expires_at! * 1000).toLocaleString()}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400">
                <User className="h-4 w-4" /> Profile State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Hook Loading</p>
                <p className={loading ? "text-amber-400" : "text-emerald-400"}>
                  {loading ? "TRUE" : "FALSE"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">User Email</p>
                <p className="text-sm">{user?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Profile Role</p>
                <p className="text-sm font-bold text-primary">{profile?.role || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Company ID</p>
                <p className="text-xs">{profile?.company_id || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Raw User Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] overflow-auto max-h-60 p-4 bg-black/40 rounded-xl">
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Raw Profile Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] overflow-auto max-h-60 p-4 bg-black/40 rounded-xl">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
