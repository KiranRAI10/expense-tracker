import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, Edit, Target } from "lucide-react";
import api from "../services/api";
import Layout from "../components/Layout";
import GoalForm from "../components/GoalForm";
import ContributionForm from "../components/ContributionForm";
import { Alert, Confirm } from "../components/Alert";
import { useSocket } from "../context/SocketContext";
import { formatCurrency, monthLabel } from "../utils/format";

const STATUS_LABEL = { active: "Active", paused: "Paused", completed: "Completed", archived: "Archived" };

const statusColor = (s) =>
  s === "completed" ? "text-ledger" : s === "paused" ? "text-amber" : s === "archived" ? "text-slate" : "text-ink";

const Savings = () => {
  const socket = useSocket();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const confirmResolve = useRef(null);
  const selectedGoalId = useRef(null);

  useEffect(() => {
    selectedGoalId.current = selectedGoal?._id ?? null;
  }, [selectedGoal?._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on("goal:created", (goal) => {
      setGoals((prev) =>
        prev.some((g) => g._id === goal._id) ? prev : [...prev, goal]
      );
    });

    socket.on("goal:updated", (goal) => {
      setGoals((prev) =>
        prev.map((g) => (g._id === goal._id ? { ...g, ...goal } : g))
      );
      setSelectedGoal((prev) =>
        prev?._id === goal._id ? { ...prev, ...goal } : prev
      );
    });

    socket.on("goal:deleted", ({ _id }) => {
      setGoals((prev) => prev.filter((g) => g._id !== _id));
      setSelectedGoal((prev) => (prev?._id === _id ? null : prev));
      if (selectedGoalId.current === _id) {
        selectedGoalId.current = null;
        setContributions([]);
      }
    });

    socket.on("contribution:created", ({ goalId, contribution, progress }) => {
      if (selectedGoalId.current === goalId) {
        setContributions((prev) => [
          contribution,
          ...prev.filter((c) => c._id !== contribution._id),
        ]);
        setSelectedGoal((prev) => (prev ? { ...prev, progress } : prev));
      }
      setGoals((prev) =>
        prev.map((g) => (g._id === goalId ? { ...g, progress } : g))
      );
    });

    socket.on("contribution:deleted", ({ contributionId, goalId, progress }) => {
      if (selectedGoalId.current === goalId) {
        setContributions((prev) => prev.filter((c) => c._id !== contributionId));
        setSelectedGoal((prev) => (prev ? { ...prev, progress } : prev));
      }
      setGoals((prev) =>
        prev.map((g) => (g._id === goalId ? { ...g, progress } : g))
      );
    });

    return () => {
      socket.off("goal:created");
      socket.off("goal:updated");
      socket.off("goal:deleted");
      socket.off("contribution:created");
      socket.off("contribution:deleted");
    };
  }, [socket]);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/goals");
      setGoals(data);
    } catch (err) {
      console.error(err);
      setAlertMessage("Failed to load goals.");
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const openGoal = async (goal) => {
    selectedGoalId.current = goal._id;
    setSelectedGoal(goal);
    setContributions([]);
    try {
      const { data } = await api.get(`/goals/${goal._id}/contributions`);
      if (selectedGoalId.current === goal._id) setContributions(data);
    } catch (err) {
      console.error(err);
      setAlertMessage("Failed to load contributions.");
      setAlertOpen(true);
    }
  };

  const handleCreateGoal = async (payload) => {
    await api.post("/goals", payload);
    setShowGoalForm(false);
    await loadGoals();
  };

  const handleUpdateGoal = async (payload) => {
    await api.put(`/goals/${editingGoal._id}`, payload);
    setShowGoalForm(false);
    setEditingGoal(null);
    await loadGoals();
  };

  const handleArchiveGoal = (id) => {
    setConfirmMessage("Archive this goal?");
    confirmResolve.current = async (confirmed) => {
      setConfirmOpen(false);
      if (!confirmed) return;
      try {
        await api.put(`/goals/${id}`, { status: "archived" });
        await loadGoals();
        if (selectedGoalId.current === id) {
          selectedGoalId.current = null;
          setSelectedGoal(null);
          setContributions([]);
        }
      } catch {
        setAlertMessage("Could not archive goal.");
        setAlertOpen(true);
      }
    };
    setConfirmOpen(true);
  };

  const handleAddContribution = async (payload) => {
    if (!selectedGoal) return;
    const goalId = selectedGoal._id;
    const { data } = await api.post(
      `/goals/${goalId}/contributions`,
      payload
    );
    if (selectedGoalId.current === goalId) {
      setContributions((prev) => [
        data.contribution,
        ...prev.filter((c) => c._id !== data.contribution._id),
      ]);
      setSelectedGoal((prev) =>
        prev ? { ...prev, ...data.goal, progress: data.progress } : prev
      );
    }
    setGoals((prev) =>
      prev.map((g) =>
        g._id === goalId
          ? { ...g, ...data.goal, progress: data.progress }
          : g
      )
    );
    setShowContributionForm(false);
  };

  const handleDeleteContribution = (id) => {
    const goalId = selectedGoal?._id;
    if (!goalId) return;
    setConfirmMessage("Remove this contribution?");
    confirmResolve.current = async (confirmed) => {
      setConfirmOpen(false);
      if (!confirmed) return;
      try {
        const { data } = await api.delete(
          `/goals/${goalId}/contributions/${id}`
        );
        if (selectedGoalId.current === goalId) {
          setContributions((prev) => prev.filter((c) => c._id !== id));
          setSelectedGoal((prev) =>
            prev ? { ...prev, ...data.goal, progress: data.progress } : prev
          );
        }
        setGoals((prev) =>
          prev.map((g) =>
            g._id === goalId
              ? { ...g, ...data.goal, progress: data.progress }
              : g
          )
        );
      } catch {
        setAlertMessage("Could not delete contribution.");
        setAlertOpen(true);
      }
    };
    setConfirmOpen(true);
  };

  const handleConfirm = (confirmed) => {
    if (confirmResolve.current) confirmResolve.current(confirmed);
    confirmResolve.current = null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center text-sm text-slate">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Alert isOpen={alertOpen} message={alertMessage} onClose={() => setAlertOpen(false)} />
      <Confirm
        isOpen={confirmOpen}
        message={confirmMessage}
        onConfirm={() => handleConfirm(true)}
        onCancel={() => handleConfirm(false)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Savings goals</h1>
          <p className="mt-1 text-sm text-slate">
            Plan for goals and track progress toward your target date.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowGoalForm(true);
          }}
          className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light"
        >
          <Plus size={16} /> Add goal
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-3 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-ink/15 text-sm text-slate">
            No savings goals yet. Add your first goal above.
          </div>
        ) : (
          goals.map((g) => {
            const p = g.progress || { saved: 0, remaining: g.targetAmount, percentage: 0, daysRemaining: 0, weeklyNeeded: 0, monthlyNeeded: 0, reached: false };
            return (
              <div
                key={g._id}
                className="rounded-lg border border-ink/10 bg-white p-5 hover:bg-paper-dim/30 transition cursor-pointer"
                onClick={() => openGoal(g)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium uppercase tracking-wide ${statusColor(g.status)}`}>
                    {STATUS_LABEL[g.status]}
                  </span>
                  {g.status === "completed" && <Target size={14} className="text-ledger" />}
                </div>
                <h3 className="font-display text-base font-semibold text-ink truncate">{g.name}</h3>
                <p className="mt-1 text-xs text-slate">{g.description || "No description"}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate mb-1">
                    <span>Saved</span>
                    <span className="font-mono">{formatCurrency(p.saved, g.currency)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dim">
                    <div className="h-full rounded-full bg-ledger transition-all" style={{ width: `${p.percentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate mt-1">
                    <span>Remaining</span>
                    <span className="font-mono">{formatCurrency(p.remaining, g.currency)}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate">
                  <div className="flex justify-between">
                    <span>Target date</span>
                    <span>{monthLabel(g.targetDate.slice(0, 7))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days left</span>
                    <span className="font-mono">{p.daysRemaining}</span>
                  </div>
                  {!p.reached && g.status === "active" && (
                    <div className="flex justify-between">
                      <span>Needed / month</span>
                      <span className="font-mono">{formatCurrency(p.monthlyNeeded, g.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedGoal && (
        <div className="mt-8 rounded-lg border border-ink/10 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{selectedGoal.name}</h2>
              <p className="text-sm text-slate">
                {selectedGoal.currency} · {STATUS_LABEL[selectedGoal.status]}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingGoal(selectedGoal);
                  setShowGoalForm(true);
                }}
                className="rounded p-1.5 text-slate hover:bg-ink/5 hover:text-ink"
                aria-label="Edit goal"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleArchiveGoal(selectedGoal._id)}
                className="rounded p-1.5 text-slate hover:bg-rust/10 hover:text-rust"
                aria-label="Archive goal"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs text-slate uppercase">Saved</p>
              <p className="font-mono text-lg font-semibold text-ink">
                {formatCurrency(selectedGoal.progress?.saved || 0, selectedGoal.currency)}
              </p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs text-slate uppercase">Remaining</p>
              <p className="font-mono text-lg font-semibold text-ink">
                {formatCurrency(selectedGoal.progress?.remaining ?? selectedGoal.targetAmount, selectedGoal.currency)}
              </p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs text-slate uppercase">Complete</p>
              <p className="font-mono text-lg font-semibold text-ledger">
                {selectedGoal.progress?.percentage || 0}%
              </p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs text-slate uppercase">Days left</p>
              <p className="font-mono text-lg font-semibold text-ink">
                {selectedGoal.progress?.daysRemaining || 0}
              </p>
            </div>
          </div>

          {!selectedGoal.progress?.reached && selectedGoal.status === "active" && (
            <div className="rounded-lg border border-ink/10 bg-white p-4 mb-6">
              <p className="text-xs text-slate uppercase mb-2">Suggested contribution</p>
              <div className="flex gap-3">
                <span className="font-mono text-sm text-ink">
                  {formatCurrency(selectedGoal.progress?.monthlyNeeded || 0, selectedGoal.currency)} / month
                </span>
                <span className="font-mono text-sm text-slate">
                  or {formatCurrency(selectedGoal.progress?.weeklyNeeded || 0, selectedGoal.currency)} / week
                </span>
              </div>
              <p className="mt-1 text-xs text-slate">
                Based on your target date and remaining amount.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-ink">Contributions</h3>
            <button
              onClick={() => setShowContributionForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light"
            >
              <Plus size={14} /> Record
            </button>
          </div>

          {contributions.length === 0 ? (
            <p className="text-sm text-slate">No contributions recorded yet.</p>
          ) : (
            <div className="divide-y divide-ink/8 rounded-lg border border-ink/10 bg-white">
              {contributions.map((c) => (
                <div key={c._id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.type === "withdrawal" || c.type === "correction" ? "bg-rust" : "bg-ledger"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-ink">
                        {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                      </p>
                      <p className="text-xs text-slate">
                        {new Date(c.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span
                      className={`font-mono font-semibold ${
                        c.type === "withdrawal" || c.type === "correction" ? "text-rust" : "text-ledger"
                      }`}
                    >
                      {(c.type === "withdrawal" || c.type === "correction" ? "−" : "+")}
                      {formatCurrency(c.amount, selectedGoal.currency)}
                    </span>
                    {c.description && (
                      <span className="text-xs text-slate truncate max-w-xs">{c.description}</span>
                    )}
                    <button
                      onClick={() => handleDeleteContribution(c._id)}
                      className="rounded p-1 text-slate/50 hover:bg-rust/10 hover:text-rust"
                      aria-label="Delete contribution"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showGoalForm && (
        <GoalForm
          initialData={editingGoal}
          onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
        />
      )}
      {showContributionForm && selectedGoal && (
        <ContributionForm
          goal={selectedGoal}
          onSubmit={handleAddContribution}
          onClose={() => setShowContributionForm(false)}
        />
      )}
    </Layout>
  );
};

export default Savings;
