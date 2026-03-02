import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(t("login.fillAll"));
      return;
    }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoginLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error(t("login.fillAll"));
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("login.resetSent"));
      setResetMode(false);
    }
  };

  if (resetMode) {
    return (
      <AuthLayout title={t("login.resetTitle")} subtitle={t("login.resetSubtitle")}>
        <div className="flex flex-col gap-4 flex-1">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t("login.resetHeading")}</h2>
          <input className={inputClass} placeholder="johndoe@mail.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex items-center justify-between pt-4">
            <button onClick={() => setResetMode(false)} className="text-lg text-muted-foreground hover:text-foreground transition-colors">{t("common.back")}</button>
            <button onClick={handleResetPassword} disabled={resetLoading} className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
              {resetLoading ? "..." : t("login.resetSend")} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("login.title")} subtitle={t("login.subtitle")}>
      <div className="flex flex-col gap-4 flex-1">
        <h2 className="text-2xl font-bold text-foreground mb-4">{t("login.heading")}</h2>
        <input className={inputClass} placeholder="johndoe@mail.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <input className={inputClass} placeholder="••••••••••••" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => navigate("/")} className="text-lg text-muted-foreground hover:text-foreground transition-colors">{t("common.back")}</button>
          <button onClick={handleLogin} disabled={loginLoading} className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
            {loginLoading ? "..." : t("login.heading")} <ArrowRight size={20} />
          </button>
        </div>
        <div className="text-center mt-2">
          <button onClick={() => setResetMode(true)} className="text-coly-purple underline text-sm hover:opacity-80">{t("login.forgotPassword")}</button>
        </div>

        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-muted-foreground/20" />
          <span className="mx-3 text-xs text-muted-foreground">{t("common.or")}</span>
          <div className="flex-1 border-t border-muted-foreground/20" />
        </div>

        <button
          onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (error) toast.error(error.message);
          }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-muted-foreground/20 bg-background text-foreground font-medium hover:bg-muted transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {t("login.continueGoogle")}
        </button>

        <button
          onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("apple", {
              redirect_uri: window.location.origin,
            });
            if (error) toast.error(error.message);
          }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-muted-foreground/20 bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          {t("login.continueApple")}
        </button>
      </div>
    </AuthLayout>
  );
};

export default Login;
