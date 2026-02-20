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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-muted pb-safe z-50">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          if (tab.center) {
            return (
              <button key={i} onClick={() => navigate(tab.path)} className="-mt-6 w-14 h-14 rounded-2xl bg-coly-blue-dark flex items-center justify-center shadow-lg">
                <Icon size={24} className="text-white" />
              </button>
            );
          }
          const active = location.pathname === tab.path && i === 0;
          return (
            <button key={i} onClick={() => navigate(tab.path)} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={22} className={active ? "text-coly-blue" : "text-muted-foreground"} />
              {active && <div className="w-1.5 h-1.5 rounded-full bg-coly-blue" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
