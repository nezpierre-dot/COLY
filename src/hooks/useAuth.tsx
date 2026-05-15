import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "demandeur" | "voyageur" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data) {
      setRoles(data.map((r: { role: AppRole }) => r.role));
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Stamp analytics with current user id (RLS still enforces auth.uid() = user_id)
        import("@/lib/analytics").then(({ setAnalyticsUser }) => setAnalyticsUser(session?.user?.id ?? null));
        // Redeem a pending referral code captured at signup (?ref=CODE)
        if (_event === "SIGNED_IN" && session?.user) {
          let pendingRef: string | null = null;
          try { pendingRef = localStorage.getItem("nidit_ref"); } catch { /* ignore */ }
          if (pendingRef) {
            supabase.functions
              .invoke("redeem-referral", { body: { code: pendingRef } })
              .then(({ error }) => {
                if (!error) { try { localStorage.removeItem("nidit_ref"); } catch { /* ignore */ } }
              })
              .catch(() => { /* keep code for a later retry */ });
          }
        }
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      import("@/lib/analytics").then(({ setAnalyticsUser }) => setAnalyticsUser(session?.user?.id ?? null));
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  // Permet de re-fetch les rôles après un toggle_user_role sans reload complet
  const refresh = async () => {
    if (user) await fetchRoles(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
