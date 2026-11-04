import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import api from "../services/api";

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/budget-monitor/notifications?limit=10");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/budget-monitor/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(c - 1, 0));
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate/60 hover:text-rust focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rust" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-ink/10 bg-white shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/5">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            <button
              onClick={() => {
                api.patch("/budget-monitor/notifications/read-all").catch(() => {});
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              className="text-xs text-ledger hover:text-rust"
            >
              Mark all read
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-slate">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-sm text-slate text-center">No notifications.</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`px-4 py-3 border-b border-ink/5 cursor-pointer hover:bg-paper-dim flex items-start gap-3 ${
                    !n.read ? "bg-ledger/5" : ""
                  }`}
                  onClick={() => markRead(n._id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-rust font-medium">{n.threshold}%</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-ink font-medium">{n.title}</p>
                    <p className="text-xs text-slate mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate mt-1">
                      {n.month} • {n.read ? "Read" : "Unread"}
                    </p>
                  </div>
                  {!n.read && (
                    <CheckCircle2 size={12} strokeWidth={1.75} className="text-slate/40 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-ink/5">
            <button
              onClick={() => {
                api.get("/budget-monitor/notifications?limit=50").then((res) => {
                  setNotifications(res.data.notifications);
                  setUnreadCount(res.data.unreadCount);
                });
              }}
              className="w-full text-xs text-ledger hover:text-rust"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
