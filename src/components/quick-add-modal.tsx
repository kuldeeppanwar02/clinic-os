"use client";

import { useState, useRef, useEffect } from "react";
import { X, UserPlus, Phone, User, CheckCircle2 } from "lucide-react";
import { useLang } from "@/i18n/lang-provider";

type QuickAddModalProps = {
  onClose: () => void;
  onAdd: (name: string, mobile: string) => Promise<{ token: string }>;
};

export function QuickAddModal({ onClose, onAdd }: QuickAddModalProps) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successToken, setSuccessToken] = useState("");
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus name field on open
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Patient ka naam likhna zaruri hai.");
      return;
    }
    setError("");
    setBusy(true);

    try {
      const result = await onAdd(name.trim(), mobile.trim());
      setSuccessToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding patient.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setName("");
    setMobile("");
    setSuccessToken("");
    setError("");
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => !busy && onClose()}
      />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {!successToken && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            disabled={busy}
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {successToken ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-soft)]">
              <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[var(--accent-strong)]">Parchi Ban Gayi!</h2>
            <p className="mt-1 text-sm text-gray-500">Is patient ka token number hai:</p>
            
            <div className="mt-5 rounded-2xl bg-[rgba(19,49,58,0.04)] py-6 border border-dashed border-[var(--line)]">
              <p className="text-sm font-bold text-[var(--accent-strong)]">{name}</p>
              <p className="display-type mt-2 text-5xl text-[var(--accent)]">{successToken}</p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button 
                type="button"
                className="btn btn-outline w-full justify-center"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Slip
              </button>
              <div className="flex gap-2">
                <button 
                  type="button"
                  className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex-1 justify-center"
                  onClick={onClose}
                >
                  Done
                </button>
                <button 
                  type="button"
                  className="btn btn-primary flex-1 justify-center"
                  onClick={resetForm}
                >
                  + Add Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                <UserPlus className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--accent-strong)]">Quick Add</h2>
                <p className="text-xs text-gray-500">Bina phone wale patient ke liye parchi banayein</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-medium text-[var(--danger)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                  Patient Name <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    className="input !pl-10"
                    placeholder="E.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                  Mobile Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    className="input !pl-10"
                    placeholder="10 digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    maxLength={10}
                    disabled={busy}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg w-full justify-center"
                  disabled={busy}
                >
                  {busy ? "Generating Token..." : "Generate Token"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
