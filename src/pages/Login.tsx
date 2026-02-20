import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <AuthLayout title="Content de vous revoir !" subtitle="Connectez-vous pour continuer vos échanges en toute simplicité.">
      <div className="flex flex-col gap-4 flex-1">
        <h2 className="text-2xl font-bold text-foreground mb-4">Connexion</h2>
        <input className={inputClass} placeholder="johndoe@mail.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <input className={inputClass} placeholder="••••••••••••" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => navigate("/")} className="text-lg text-muted-foreground hover:text-foreground transition-colors">Retour</button>
          <button onClick={handleLogin} disabled={loading} className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
            {loading ? "..." : "Connexion"} <ArrowRight size={20} />
          </button>
        </div>
        <div className="text-center mt-2">
          <button className="text-coly-purple underline text-sm hover:opacity-80">Mot de passe oublié?</button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
