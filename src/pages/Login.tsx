import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

  const handleLogin = () => {
    navigate("/dashboard");
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
          <button onClick={() => navigate("/")} className="text-lg text-muted-foreground hover:text-foreground transition-colors">
            Retour
          </button>
          <button onClick={handleLogin} className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg">
            Connexion <ArrowRight size={20} />
          </button>
        </div>

        <div className="text-center mt-2">
          <button className="text-coly-purple underline text-sm hover:opacity-80">Mot de passe oublié?</button>
        </div>

        <div className="border-t border-muted mt-4 pt-6">
          <button className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-muted-foreground/20 text-foreground hover:bg-muted transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connexion avec Google
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
