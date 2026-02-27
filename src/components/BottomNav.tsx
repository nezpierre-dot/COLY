import { Home, Copy, LayoutGrid, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { icon: Home, path: "/dashboard", label: "Accueil" },
  { icon: Copy, path: "/mes-missions-needit", label: "Missions" },
  { icon: LayoutGrid, path: "/dashboard", label: "", center: true },
  { icon: MessageCircle, path: "/conversations", label: "Messages" },
  { icon: User, path: "/my-account", label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      role="navigation"
      aria-label="Navigation principale"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Background layer that extends to screen edge */}
      <div className="absolute inset-0 glass-strong" style={{ bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))" }} />
      <div className="relative flex items-end justify-around pt-1.5 pb-1 max-w-lg mx-auto">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.path;

          if (tab.center) {
            return (
              <button
                key={i}
                onClick={() => navigate(tab.path)}
                aria-label="Menu principal"
                className="relative -mt-7 group"
              >
                <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-primary to-coly-blue-dark shadow-[0_4px_24px_hsl(214_80%_45%/0.4)] flex items-center justify-center transition-transform active:scale-95">
                  <Icon size={28} className="text-primary-foreground" aria-hidden="true" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={i}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 px-4 py-1 transition-colors"
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.2 : 1.6}
                className={`transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
