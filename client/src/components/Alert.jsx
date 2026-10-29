export const Alert = ({ isOpen, message, onClose, type = "error" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
      <div className="rounded-lg bg-paper p-6 shadow-2xl max-w-sm w-full">
        <p className={`text-sm ${type === "error" ? "text-rust" : "text-ink"}`}>{message}</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-light"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export const Confirm = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
      <div className="rounded-lg bg-paper p-6 shadow-2xl max-w-sm w-full">
        <p className="text-sm text-ink">{message}</p>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-ink border border-ink/10 hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-rust px-4 py-2 text-sm font-medium text-white hover:bg-rust-light"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
