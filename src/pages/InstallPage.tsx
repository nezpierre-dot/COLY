import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Smartphone, Share2, MoreHorizontal, Plus, Bell, BellOff, CheckCircle2, ArrowLeft, PartyPopper, XCircle, AlertTriangle, Zap, Wifi, Maximize, Rocket, HardDrive } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import BottomNav from "@/components/BottomNav";

const InstallPage = () => {
  const navigate = useNavigate();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { permission, loading, subscribe, unsubscribe } = usePushNotifications();

  const isNotifGranted = permission === "granted";
  const isNotifDenied = permission === "denied";
  const isNotifUnsupported = permission === "unsupported";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-10">
        <button onClick={() => navigate(-1)} className="text-muted-foreground mb-5" aria-label="Retour">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-1">Installer l'application</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Accédez à Nidit depuis votre écran d'accueil, même sans connexion internet.
        </p>

        {/* Install card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <img src="/icons/pwa-192x192.png" alt="Nidit" className="w-16 h-16 rounded-2xl shadow-md" />
            <div>
              <h2 className="font-bold text-foreground text-lg">Nidit</h2>
              <p className="text-sm text-muted-foreground">Transport collaboratif</p>
              {isInstalled && (
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">Déjà installée</span>
                </div>
              )}
            </div>
          </div>

          {!isInstalled && (
            <>
              {/* Android / Desktop — native prompt */}
              {canInstall && (
                <button
                  onClick={promptInstall}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity mb-3"
                >
                  <Download size={18} />
                  Installer sur cet appareil
                </button>
              )}

              {/* iOS manual instructions */}
              {isIOS && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Instructions iPhone / iPad
                  </p>
                  {[
                    { icon: <Share2 size={18} className="text-primary" />, text: 'Appuyez sur le bouton Partager' },
                    { icon: <Plus size={18} className="text-primary" />, text: 'Sélectionnez "Sur l\'écran d\'accueil"' },
                    { icon: <Smartphone size={18} className="text-primary" />, text: 'Appuyez sur "Ajouter" en haut à droite' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-3.5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {step.icon}
                      </div>
                      <p className="text-sm text-foreground">{step.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Generic browser instructions */}
              {!canInstall && !isIOS && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Instructions navigateur
                  </p>
                  {[
                    { icon: <MoreHorizontal size={18} className="text-primary" />, text: 'Ouvrez le menu du navigateur (⋮ ou ⋯)' },
                    { icon: <Download size={18} className="text-primary" />, text: 'Sélectionnez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-3.5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {step.icon}
                      </div>
                      <p className="text-sm text-foreground">{step.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {isInstalled && (
            <div className="bg-primary/8 border border-primary/15 rounded-xl p-3.5 text-sm text-foreground">
              <PartyPopper size={16} className="inline mr-1.5 text-primary" /> L'application est installée ! Retrouvez-la sur votre écran d'accueil.
            </div>
          )}
        </motion.div>

        {/* Push notifications card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 mb-4"
        >
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <Bell size={18} className="text-accent" />
            Notifications push
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Recevez des alertes en temps réel pour vos colis, missions et messages — même quand l'app est fermée.
          </p>

          {isNotifUnsupported && (
            <div className="bg-muted rounded-xl p-3.5 text-sm text-muted-foreground">
              <AlertTriangle size={16} className="inline mr-1.5" /> Les notifications push ne sont pas supportées sur ce navigateur.
            </div>
          )}

          {isNotifDenied && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 text-sm text-destructive">
              <XCircle size={16} className="inline mr-1.5" /> Notifications bloquées. Allez dans les paramètres de votre navigateur et autorisez les notifications pour ce site.
            </div>
          )}

          {!isNotifUnsupported && !isNotifDenied && (
            <>
              {isNotifGranted ? (
                <div className="space-y-3">
                  <div className="bg-primary/8 border border-primary/15 rounded-xl p-3.5 flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    Notifications activées
                  </div>
                  <button
                    onClick={unsubscribe}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/70 transition-colors disabled:opacity-50"
                  >
                    <BellOff size={16} />
                    {loading ? "Désactivation…" : "Désactiver les notifications"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={subscribe}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Bell size={18} />
                  {loading ? "Activation…" : "Activer les notifications"}
                </button>
              )}
            </>
          )}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="font-semibold text-foreground mb-3 text-sm">Avantages de l'app installée</h3>
          <ul className="space-y-2.5">
            {[
              { icon: <Zap size={16} className="text-amber-400" />, text: "Chargement instantané, même hors connexion" },
              { icon: <Bell size={16} className="text-primary" />, text: "Notifications en temps réel pour vos colis" },
              { icon: <Maximize size={16} className="text-accent" />, text: "Expérience plein écran native" },
              { icon: <Rocket size={16} className="text-emerald-400" />, text: "Accès rapide depuis l'écran d'accueil" },
              { icon: <HardDrive size={16} className="text-muted-foreground" />, text: "Données mises en cache pour une utilisation offline" },
            ].map((benefit, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">{benefit.icon}</span>
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default InstallPage;
