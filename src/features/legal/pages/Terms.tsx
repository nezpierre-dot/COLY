import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/AuthLayout";
import { useTranslation } from "@/hooks/useTranslation";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  return (
    <AuthLayout title={t("terms.title")} subtitle={t("terms.subtitle")}>
      <div className="flex flex-col gap-6 flex-1">
        <div className="bg-rose-50 rounded-xl p-5 max-h-64 overflow-y-auto text-sm text-foreground leading-relaxed relative">
          <p>{t("terms.body.p1")}</p>
          <p className="mt-2">{t("terms.body.p2")}</p>
          <div className="flex justify-center mt-2 text-foreground/50"><ChevronDown size={20} /></div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-1" />
          <span className="text-sm text-foreground">{t("terms.accept")}</span>
        </div>
        <div className="flex-1" />
        <div className="flex justify-center">
          <button onClick={() => navigate("/dashboard")} disabled={!accepted} className="flex items-center gap-2 px-10 py-3 rounded-full bg-coly-blue text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
            {t("terms.finalize")} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Terms;
