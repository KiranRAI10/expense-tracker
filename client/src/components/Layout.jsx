import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, Wallet, Target, Bot, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/savings", label: "Savings", icon: Target },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/chat", label: "Chat", icon: Bot },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col justify-between bg-ink text-paper">
        <div>
          <div className="border-b border-white/10 px-6 py-6">
            <p className="font-display text-2xl font-semibold tracking-tight">Ledger</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-white/40">
              expense tracker
            </p>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-3">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-ledger/90 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={17} strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4 flex flex-col gap-2">
          <div>
            <p className="truncate px-2 text-sm font-medium text-white/90">{user?.name}</p>
            <p className="truncate px-2 text-xs text-white/40">{user?.email}</p>
          </div>
          <NotificationDropdown user={user} />
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-rust-light"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
