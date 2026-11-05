import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import PrivateRoute from "./components/PrivateRoute";

// Lazy load pages for fast initial bundle and instant page load
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Categories = lazy(() => import("./pages/Categories"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Savings = lazy(() => import("./pages/Savings"));
const Chat = lazy(() => import("./pages/Chat"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-paper">
    <div className="flex items-center gap-2 text-sm text-slate">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ledger border-t-transparent" />
      Loading…
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <SocketProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <PrivateRoute>
                      <Transactions />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <PrivateRoute>
                      <Categories />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/budgets"
                  element={
                    <PrivateRoute>
                      <Budgets />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/savings"
                  element={
                    <PrivateRoute>
                      <Savings />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <PrivateRoute>
                      <Chat />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
