"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

export default function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? "unlocked" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: input }),
    });
    if (res.ok) {
      setStatus("unlocked");
    } else {
      setError("Wrong passcode.");
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
          <div className="flex items-center gap-2 text-bas-gold mb-2">
            <Lock size={20} />
            <span className="font-semibold tracking-wide">BAS Studio</span>
          </div>
          <input
            autoFocus
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Passcode"
            className="bg-black border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="bg-bas-gold hover:bg-bas-gold-hover text-black font-semibold rounded-lg py-2.5 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
