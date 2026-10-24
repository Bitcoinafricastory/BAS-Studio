"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

export default function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? "unlocked" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  // If the session runs out while the app is open (or the passcode changes), any API call comes
  // back 401. Return to the lock screen instead of leaving screens full of raw errors.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].pathname : (args[0] as Request).url;
        if (/\/api\//.test(url) && !/\/api\/auth\//.test(url)) {
          setError("Your session ended. Enter the passcode to continue.");
          setStatus("locked");
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !input) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: input }),
      });
      if (res.ok) {
        setInput("");
        setStatus("unlocked");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 401 ? "Wrong passcode." : data.error || "Couldn’t sign in. Try again.");
        setInput("");
      }
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "checking") {
    return <div className="min-h-screen bg-black" />;
  }

  if (status === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <form
          onSubmit={submit}
          className="w-full max-w-sm bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-gold-fg mb-2">
            <Lock size={20} />
            <span className="font-semibold tracking-wide">BAS Studio</span>
          </div>
          <input
            autoFocus
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Passcode"
            aria-label="Passcode"
            autoComplete="current-password"
            className="bg-black border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !input}
            className="flex items-center justify-center gap-2 bg-bas-gold hover:bg-bas-gold-hover text-on-gold font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
