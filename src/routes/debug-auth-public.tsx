import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Key, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/debug-auth-public")({
  component: AuthDebugPublicPage,
});

function AuthDebugPublicPage() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      setError(null);
      console.log("DEBUG_AUTH: Starting check...");
      
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          console.log("DEBUG_AUTH: Session found, fetching profile...");
          const { data: currentProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .maybeSingle();
            
          if (profileError) throw profileError;
          setProfile(currentProfile);
          console.log("DEBUG_AUTH: Profile fetch result:", currentProfile);
        } else {
          console.log("DEBUG_AUTH: No session found");
        }
      } catch (err: any) {
        console.error("DEBUG_AUTH: Error during check:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
        console.log("DEBUG_AUTH: Check finished");
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
          <Shield className="h-8 w-8" /> Public Auth Debug
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
                {loading ? (
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
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-xs">{session.user.email}</p>
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
                <p className="text-xs text-slate-500">Profile Found?</p>
                <p className={profile ? "text-emerald-400" : "text-rose-400"}>
                  {profile ? "YES" : "NO"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm font-bold text-primary">{profile?.role || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Error</p>
                <p className="text-xs text-rose-400">{error || "None"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Raw Profile</CardTitle>
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
