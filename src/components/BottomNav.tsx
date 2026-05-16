import { Home, LayoutGrid, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { hapticLight } from "@/lib/haptics";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadMessages } from "@/features/chat";

import { useAuth } from "@/hooks/useAuth";

const tabsDef = [
  { icon: Home, path: "/dashboard", key: "nav.home" },
  { icon: LayoutGrid, path: "/mes-missions-needit", key: "nav.missions" },
  { icon: MessageCircle, path: "/conversations", key: "nav.messages" },
  { icon: User, path: "/my-account", key: "nav.profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { roles } = useAuth();
  const unreadMessages = useUnreadMessages();
  
  const tabs = tabsDef.map(tab => ({ ...tab, label: t(tab.key) }));
  const isVoyageur = roles.includes("voyageur");

  return (
    <>
      {/* Role status bar removed – cleaner premium look */}

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        role="navigation"
        aria-label="Navigation principale"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="absolute inset-0 bg-white/90 dark:bg-[#0F1115]/95 backdrop-blur-xl border-t border-[#E2E8F0] dark:border-[#2A3245]" style={{ bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))" }} />
        <div className="relative flex items-end justify-around pt-2 pb-1.5 max-w-lg mx-auto">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const active = location.pathname === tab.path;
            const showBadge = tab.path === "/conversations" && unreadMessages > 0;
            const badgeCount = tab.path === "/conversations" ? unreadMessages : 0;

            return (
              <button
                key={i}
                type="button"
                onClick={() => { hapticLight(); navigate(tab.path); }}
                aria-label={showBadge ? `${tab.label} — ${badgeCount} non lu${badgeCount > 1 ? "s" : ""}` : tab.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 px-5 py-1 min-h-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative ${
                    active ? "bg-[#0D84FF]/15" : ""
                  }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.2 : 1.6}
                    style={{ color: active ? "#0D84FF" : "#64748B" }}
                    aria-hidden="true"
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold border border-white dark:border-[#0F1115] animate-bounce"
                      style={{ backgroundColor: "#FF453A", color: "#FFFFFF" }}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: active ? "#0D84FF" : "#64748B" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
