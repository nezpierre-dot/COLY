import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/AuthLayout";

const Terms = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <AuthLayout title="Félicitations" subtitle="Conditions générales d'utilisation">
      <div className="flex flex-col gap-6 flex-1">
        <div className="bg-rose-50 rounded-xl p-5 max-h-64 overflow-y-auto text-sm text-foreground leading-relaxed relative">
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU »)
            régissent l'accès et l'utilisation de l'application Coly (ci-après « l'Application »),
            qui permet la mise en relation entre les utilisateurs souhaitant partager de l'espace
            de bagages avec d'autres utilisateurs. En accédant à l'Application ou en l'utilisant,
            vous acceptez sans réserve les présentes CGU.
          </p>
          <p className="mt-2">
            Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser l'Application.
          </p>
          <div className="flex justify-center mt-2 text-foreground/50">
            <ChevronDown size={20} />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-1" />
          <span className="text-sm text-foreground">
            En utilisant cette application, vous acceptez les conditions générales d'utilisation (CGU) ci-dessus.
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            disabled={!accepted}
            className="flex items-center gap-2 px-10 py-3 rounded-full bg-coly-blue text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
          >
            Finaliser <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Terms;
