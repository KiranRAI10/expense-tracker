import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-semibold text-paper">Ledger</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
            expense tracker
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-paper p-8 shadow-xl">
          <h1 className="font-display text-xl font-semibold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-slate">Start tracking your money in minutes.</p>

          {error && (
            <div className="mt-4 rounded-md bg-rust/10 px-3 py-2 text-sm text-rust">
              {error}
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="Jordan Rivera"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="you@example.com"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ledger focus:ring-1 focus:ring-ledger"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-ledger py-2.5 text-sm font-medium text-white transition hover:bg-ledger-dark disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-5 text-center text-sm text-slate">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-ledger hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
