import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, Wallet, Target, Bot, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrency, COMMON_CURRENCIES } from "../context/CurrencyContext";
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
  const { baseCurrency, setCurrency, loading: currencyLoading } = useCurrency();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar Navigation */}
      <aside className="flex w-60 shrink-0 flex-col justify-between bg-ink text-paper">
        <div>
          {/* Brand Header */}
          <div className="border-b border-white/10 px-6 py-6">
            <p className="font-display text-2xl font-semibold tracking-tight">Ledger</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-white/40">
              expense tracker
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 flex flex-col gap-1 px-3">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-ledger/90 text-white font-medium"
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

        {/* User Profile & Logout */}
        <div className="border-t border-white/10 p-4 flex flex-col gap-3">
          <div>
            <p className="truncate px-2 text-sm font-medium text-white/90">{user?.name}</p>
            <p className="truncate px-2 text-xs text-white/40">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-rust-light"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar with Notifications & Currency */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-ink/8 bg-paper/95 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-medium text-ink/70">Personal Finance</span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Currency Selector Pill */}
            <div className="flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-xs shadow-sm">
              <span className="text-slate font-medium">Currency:</span>
              <select
                value={baseCurrency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={currencyLoading}
                className="font-mono font-semibold text-ink bg-transparent outline-none cursor-pointer hover:text-ledger focus:text-ledger"
                aria-label="Change currency"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Dropdown placed at the top for optimal visibility */}
            <NotificationDropdown placement="bottom-right" />

            {/* User Avatar Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-ink/10">
              <div className="h-8 w-8 rounded-full bg-ledger/10 text-ledger flex items-center justify-center font-display text-xs font-bold ring-1 ring-ledger/20">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
