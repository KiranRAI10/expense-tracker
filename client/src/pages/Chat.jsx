import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Layout from "../components/Layout";
import { formatCurrency } from "../utils/format";
import { Send, Bot, AlertCircle } from "lucide-react";

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text, sender, action) => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, text, sender, action }]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    addMessage(userText, "user");
    setLoading(true);

    try {
      const { data } = await api.post("/chat", { message: userText });
      addMessage(data.response, "bot", data.action || null);
      if (data.action?.type === "add_transaction") {
        setConfirming(data.action.proposed);
      }
    } catch {
      addMessage("Sorry, I couldn't process that. Please try again.", "bot");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!confirming) return;
    setLoading(true);
    try {
      await api.post("/transactions", {
        amount: confirming.amount,
        type: confirming.type,
        category: confirming.category,
        description: confirming.description || "Added via chat",
        date: confirming.date,
      });
      addMessage(
        `Added ${formatCurrency(confirming.amount, user?.currency)} as ${confirming.type} under "${confirming.categoryName}".`,
        "bot",
      );
      setConfirming(null);
    } catch {
      addMessage("Failed to add the transaction. Please try from the Transactions page.", "bot");
      setConfirming(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAdd = () => {
    addMessage("Okay, I didn't add anything.", "bot");
    setConfirming(null);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
              <Bot size={24} strokeWidth={1.75} /> Ledger Assistant
            </h1>
            <p className="mt-1 text-sm text-slate">Ask about your spending, budget, or add a transaction.</p>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-1 shadow-sm h-[60vh] overflow-y-auto flex flex-col mb-4">
          <div className="flex-1 overflow-y-auto pr-2">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-slate text-sm">
                Start a conversation…
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-2xl mb-2 ${
                  msg.sender === "user"
                    ? "ml-auto bg-ledger text-white text-sm"
                    : "mr-auto bg-paper-dim border border-ink/5 text-ink text-sm"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="ml-auto max-w-[85%] p-3 rounded-2xl mb-2 bg-paper-dim border border-ink/5 text-ink text-sm flex items-center gap-2">
                <span className="animate-pulse">…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message… (try 'help')"
            disabled={loading || !!confirming}
            className="flex-1 px-4 py-3 rounded-xl border border-ink/10 bg-paper text-ink placeholder:text-slate/50 focus:outline-none focus:ring-2 focus:ring-ledger transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !!confirming}
            className="px-4 py-3 rounded-xl bg-ledger text-white hover:bg-ledger/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={16} strokeWidth={1.75} />
          </button>
        </form>

        {confirming && (
          <div className="mt-4 rounded-lg border border-amber/20 bg-amber/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} strokeWidth={1.75} className="text-amber mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink">Confirm new transaction</p>
                <p className="text-xs text-slate mt-1">
                  Add {formatCurrency(confirming.amount, user?.currency)} as{" "}
                  <span className="font-semibold capitalize">{confirming.type}</span>{" "}
                  under "{confirming.categoryName}" today?
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleConfirmAdd}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg bg-ledger text-white text-sm font-medium hover:bg-ledger/90 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelAdd}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg border border-ink/10 bg-white text-ink text-sm font-medium hover:bg-ink/5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-slate/60">
          Transactions added via chat are confirmed by you first — nothing is
          changed without your approval.
        </p>
      </div>
    </Layout>
  );
};

export default Chat;
