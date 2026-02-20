import { Home, Copy, LayoutGrid, RefreshCw, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { icon: Home, path: "/dashboard", label: "Accueil" },
  { icon: Copy, path: "/dashboard", label: "Missions" },
  { icon: LayoutGrid, path: "/dashboard", label: "Menu", center: true },
  { icon: RefreshCw, path: "/dashboard", label: "Échanges" },
  { icon: User, path: "/my-account", label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50" role="navigation" aria-label="Navigation principale">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          if (tab.center) {
            return (
              <button key={i} onClick={() => navigate(tab.path)} aria-label={tab.label}
                className="-mt-6 w-14 h-14 rounded-2xl bg-coly-blue-dark flex items-center justify-center shadow-lg">
                <Icon size={24} className="text-primary-foreground" aria-hidden="true" />
              </button>
            );
          }
          const active = location.pathname === tab.path && i === 0;
          return (
            <button key={i} onClick={() => navigate(tab.path)} aria-label={tab.label} aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={22} className={active ? "text-primary" : "text-muted-foreground"} aria-hidden="true" />
              <span className="text-[10px] font-medium text-muted-foreground">{tab.label}</span>
              {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
