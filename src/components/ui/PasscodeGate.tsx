"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

const MIN_LENGTH = 10;

type GateStatus = "checking" | "locked" | "setup" | "setup-environment" | "unlocked";

export default function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");
  const [input, setInput] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) return setStatus("unlocked");
        if (d.setup) {
          setSetupMessage(d.message || "");
          return setStatus(d.setup === "here" ? "setup" : "setup-environment");
        }
        setStatus("locked");
      })
      .catch(() => setStatus("locked"));
  }, []);

  async function createPasscode(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (input.trim().length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (input !== confirm) return setError("The two passcodes don’t match.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInput("");
        setConfirm("");
        setStatus("unlocked");
      } else if (res.status === 409) {
        setInput("");
        setConfirm("");
        setError(data.error || "A passcode already exists. Sign in with it.");
        setStatus("locked");
      } else {
        setError(data.error || "Couldn’t save the passcode. Try again.");
      }
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (status === "setup-environment") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-sm bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-gold-fg mb-1">
            <Lock size={20} />
            <span className="font-semibold tracking-wide">BAS Studio is locked</span>
          </div>
          <p className="text-sm text-gray-300">{setupMessage}</p>
        </div>
      </div>
    );
  }

  if (status === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <form
          onSubmit={createPasscode}
          className="w-full max-w-sm bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-gold-fg">
            <Lock size={20} />
            <span className="font-semibold tracking-wide">Create a passcode</span>
          </div>
          <p className="text-sm text-gray-400">
            Studio stays locked until it has a passcode. Use at least {MIN_LENGTH} characters. You can change it later in
            Settings, but not remove it.
          </p>
          <input
            autoFocus
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="New passcode"
            aria-label="New passcode"
            autoComplete="new-password"
            className="bg-black border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            aria-label="Type the new passcode again"
            autoComplete="new-password"
            className="bg-black border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !input || !confirm}
            className="flex items-center justify-center gap-2 bg-bas-gold hover:bg-bas-gold-hover text-on-gold font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Saving…" : "Create passcode"}
          </button>
        </form>
      </div>
    );
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
