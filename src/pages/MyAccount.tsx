import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Camera, Pencil, X, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = user?.id?.slice(0, 6) || "000000";
  const meta = user?.user_metadata || {};

  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState(meta.full_name || "");
  const [phone, setPhone] = useState(meta.phone || "");
  const [email] = useState(user?.email || "");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop volumineuse (max 5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim() },
    });
    if (error) toast.error(error.message);
    else { toast.success("Profil mis à jour"); setEditing(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const inputClass = "w-full border-b border-muted-foreground/30 py-2 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent text-sm";

  const Section = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card rounded-2xl border border-border divide-y divide-border mb-6">
      {children}
    </div>
  );

  const Row = ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="w-full text-center py-4 text-foreground font-semibold text-sm uppercase tracking-wide hover:bg-muted/50 transition-colors"
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mon Compte</h1>

        {/* Avatar + Info */}
        <div className="flex items-start gap-5 mb-6">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-muted-foreground">👤</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-coly-blue mt-2 block text-center w-full hover:underline"
            >
              <Camera size={12} className="inline mr-1" />
              Changer la photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 space-y-1">
            <p className="font-bold text-foreground">Voyageur</p>
            <p className="text-sm text-muted-foreground">N°{userId.toUpperCase()}</p>
            <p className="font-bold text-foreground mt-2">Expéditeur</p>
            <p className="text-sm text-muted-foreground">N°{(parseInt(userId, 16) % 999999).toString().padStart(6, "0")}</p>
          </div>

          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="shrink-0 w-9 h-9 rounded-full bg-coly-blue/10 flex items-center justify-center text-coly-blue hover:bg-coly-blue/20 transition-colors"
          >
            {editing ? <Save size={16} /> : <Pencil size={16} />}
          </button>
        </div>

        {/* Editable contact info */}
        {editing && (
          <div className="bg-muted/50 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Modifier mes informations</h3>
              <button onClick={() => setEditing(false)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nom complet</label>
              <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Téléphone</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <p className="text-sm text-muted-foreground py-2">{email}</p>
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-coly-blue text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Enregistrer
            </button>
          </div>
        )}

        {/* Sections */}
        <Section>
          <Row label="MES INFORMATIONS" onClick={() => navigate("/my-info")} />
          <Row label="RÉGLAGE VOYAGEUR" onClick={() => navigate("/voyageur-settings")} />
          <Row label="RÉGLAGE EXPÉDITEUR" onClick={() => navigate("/settings")} />
        </Section>

        <Section>
          <Row label="COMPTABILITÉ" onClick={() => navigate("/comptabilite")} />
          <Row label="CONFIDENTIALITÉ / MENTIONS LÉGALES" onClick={() => navigate("/confidentialite")} />
          <Row label="PARAMETRES DE L'APPLICATION" onClick={() => navigate("/settings")} />
        </Section>

        {/* FAQ / Aide */}
        <div className="flex gap-4">
          <button className="flex-1 py-3 rounded-2xl bg-coly-orange/80 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow">
            FAQ
          </button>
          <button className="flex-1 py-3 rounded-2xl bg-coly-orange/80 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow">
            Aide
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-destructive/30 text-destructive font-medium text-sm hover:bg-destructive/10 transition-colors mt-6"
        >
          Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default MyAccount;
