import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ChevronRight, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { hapticLight, hapticMedium } from "@/lib/haptics";

const typeIcon: Record<string, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
  kyc: "🪪",
  coly: "📦",
  needit: "🛒",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });

  // Position dropdown relative to button
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const bellCenter = rect.left + rect.width / 2;
      const openRight = bellCenter < window.innerWidth / 2;
      setPos({
        top: rect.bottom + 8,
        ...(openRight
          ? { left: Math.max(8, rect.left), right: undefined }
          : { right: Math.max(8, window.innerWidth - rect.right), left: undefined }),
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
      setSelectedNotif(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const recent = notifications.slice(0, 5);
  const hasUnread = unreadCount > 0;

  const handleNotifClick = (n: Notification) => {
    hapticLight();
    if (!n.is_read) markAsRead(n.id);
    setSelectedNotif(n);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => { hapticLight(); setOpen((o) => !o); setSelectedNotif(null); }}
        className={`relative p-2 rounded-full hover:bg-muted transition-colors ${open ? "invisible" : ""}`}
        aria-label="Notifications"
      >
        <Bell size={24} style={{ color: hasUnread ? "#FF453A" : "#64748B" }} />
        {hasUnread && (
          <span
            className="absolute -top-1 -left-1 min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1 text-[11px] font-bold text-white animate-bounce"
            style={{
              background: "#FF453A",
              border: "1px solid #FFFFFF",
              animationDuration: "1.5s",
              animationIterationCount: "3",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-80 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: pos.top, left: pos.left, right: pos.right, zIndex: 99999 }}
          >
            {selectedNotif ? (
              /* ── Detail view ── */
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <button onClick={() => setSelectedNotif(null)} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={16} />
                  </button>
                  <h3 className="font-bold text-foreground text-sm flex-1">Détail</h3>
                  <button onClick={() => { setOpen(false); setSelectedNotif(null); }} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeIcon[selectedNotif.type] || "🔔"}</span>
                    <h4 className="font-bold text-foreground text-sm">{selectedNotif.title}</h4>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {selectedNotif.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedNotif.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            ) : (
              /* ── List view ── */
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-bold text-foreground text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => { hapticMedium(); markAllAsRead(); }}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Check size={12} /> Tout lire
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune notification
                    </p>
                  ) : (
                    recent.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0 ${
                          !n.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="text-lg mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/notifications");
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-muted/60 transition-colors flex items-center justify-center gap-1 border-t border-border"
                >
                  Voir toutes les notifications <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}