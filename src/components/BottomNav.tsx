import { Home, LayoutGrid, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { hapticLight } from "@/lib/haptics";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

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
  const unreadMessages = useUnreadMessages();
  const tabs = tabsDef.map(tab => ({ ...tab, label: t(tab.key) }));

  return (
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

          return (
            <button
              key={i}
              onClick={() => { hapticLight(); navigate(tab.path); }}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 px-5 py-1 transition-colors"
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
                    {unreadMessages > 99 ? "99+" : unreadMessages}
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
  );
};

export default BottomNav;
