import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, CheckCircle2, Inbox } from "lucide-react";
import api from "../services/api";
import FormattedAmount from "./FormattedAmount";
import { monthLabel } from "../utils/format";

const NotificationDropdown = ({ placement = "bottom-right", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const { data } = await api.get("/budget-monitor/notifications?limit=15", { signal });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      if (err?.code !== "ERR_CANCELED") {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load with cleanup to prevent memory leaks
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.patch(`/budget-monitor/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(c - 1, 0));
    } catch {}
  };

  const markAllRead = () => {
    api.patch("/budget-monitor/notifications/read-all").catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const loadAll = () => {
    api
      .get("/budget-monitor/notifications?limit=50")
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  };

  const getDropdownPlacementClass = () => {
    if (placement === "top-right") {
      return "bottom-full right-0 mb-2";
    }
    if (placement === "top-left") {
      return "bottom-full left-0 mb-2";
    }
    if (placement === "bottom-left") {
      return "top-full left-0 mt-2";
    }
    return "top-full right-0 mt-2"; // default: bottom-right (opens downwards aligned to right)
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-slate transition-colors hover:border-ink/20 hover:bg-paper-dim hover:text-ink focus:outline-none shadow-sm"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={17} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-paper">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${getDropdownPlacementClass()} z-50 w-84 sm:w-96 rounded-xl border border-ink/10 bg-white shadow-2xl transition-all duration-150 ease-out flex flex-col`}
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3 bg-paper/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rust/10 px-2 py-0.5 text-[11px] font-semibold text-rust">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-ledger hover:text-ledger-dark transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto divide-y divide-ink/5 flex-1 min-h-[140px]">
            {loading && notifications.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-slate">
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center text-center px-4">
                <Inbox size={24} className="text-slate/40 mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-medium text-ink">No notifications</p>
                <p className="text-[11px] text-slate mt-0.5">You're all caught up with your budgets.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const threshold = n.threshold || 100;
                const isOver = threshold >= 100;
                const isWarning = threshold >= 90;

                return (
                  <div
                    key={n._id}
                    onClick={() => markRead(n._id)}
                    className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-paper-dim/60 ${
                      !n.read ? "bg-ledger/5 font-medium" : "bg-white"
                    }`}
                  >
                    {/* Threshold Tag */}
                    <div className="flex-shrink-0 mt-0.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-tight ${
                          isOver
                            ? "bg-rust/10 text-rust"
                            : isWarning
                            ? "bg-amber/10 text-amber"
                            : "bg-ledger/10 text-ledger"
                        }`}
                      >
                        {threshold}%
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-ink truncate">{n.title}</p>
                        {!n.read && (
                          <span
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ledger"
                            title="Unread"
                          />
                        )}
                      </div>

                      {/* Dynamic Currency Message */}
                      {n.spent !== undefined && n.limit !== undefined ? (
                        <p className="text-xs text-slate mt-0.5 leading-relaxed">
                          You've spent{" "}
                          <FormattedAmount amount={n.spent} className="font-semibold text-ink font-mono" />{" "}
                          of{" "}
                          <FormattedAmount amount={n.limit} className="font-semibold text-ink font-mono" />{" "}
                          ({threshold}%) for{" "}
                          <span className="font-medium text-ink">
                            {n.month ? monthLabel(n.month) : "this month"}
                          </span>
                          .
                        </p>
                      ) : (
                        <p className="text-xs text-slate mt-0.5 leading-relaxed">{n.message}</p>
                      )}

                      <p className="text-[10px] text-slate/70 mt-1">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : n.month}
                      </p>
                    </div>

                    {!n.read && (
                      <CheckCircle2
                        size={14}
                        strokeWidth={1.8}
                        className="text-slate/30 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0"
                        title="Click to mark as read"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length >= 10 && (
            <div className="border-t border-ink/8 px-4 py-2 bg-paper/30 rounded-b-xl text-center">
              <button
                onClick={loadAll}
                className="text-xs font-medium text-ledger hover:text-ledger-dark transition-colors"
              >
                Load more notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
