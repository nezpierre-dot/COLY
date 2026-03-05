import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import { useTranslation } from "@/hooks/useTranslation";
import { validatePassword } from "@/lib/passwordValidation";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error(t("reset.invalidLink"));
      navigate("/login");
    }
  }, [navigate]);

  const handleReset = async () => {
    if (!password || !confirmPassword) { toast.error(t("login.fillAll")); return; }
    const pwdError = validatePassword(password);
    if (pwdError) { toast.error(pwdError); return; }
    if (password !== confirmPassword) { toast.error(t("signup.passwordMismatch")); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSuccess(true); setTimeout(() => navigate("/dashboard"), 2000); }
  };

  if (success) {
    return (
      <AuthLayout title={t("reset.done")} subtitle={t("reset.doneSubtitle")}>
        <div className="flex flex-col items-center gap-4 pt-8">
          <CheckCircle2 size={64} className="text-green-500" />
          <p className="text-muted-foreground">{t("reset.redirecting")}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <div className="flex flex-col gap-4 flex-1">
        <h2 className="text-2xl font-bold text-foreground mb-4">{t("reset.heading")}</h2>
        <div className="relative">
          <input className={inputClass} placeholder={t("reset.newPassword")} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <input className={inputClass} placeholder={t("reset.confirmPassword")} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <div className="flex items-center justify-end pt-4">
          <button onClick={handleReset} disabled={loading} className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
            {loading ? "..." : t("reset.validate")} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
