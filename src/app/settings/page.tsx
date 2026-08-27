"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, KeyRound, Trash2, AlertTriangle } from "lucide-react";

type XaiStatus = "env" | "app" | "none" | null;

export default function SettingsPage() {
  const [status, setStatus] = useState<XaiStatus>(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data.xai);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyInput.trim() || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xaiApiKey: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save key");
      setKeyInput("");
      setSaved(true);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove key");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-gray-50 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">API keys and integrations.</p>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-bas-gold" />
          <h2 className="text-sm font-semibold text-gray-100">xAI (Grok) API key</h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" /> Checking status…
          </p>
        ) : status === "env" ? (
          <div className="flex items-start gap-2 text-sm text-green-400">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <p>
              Set via <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded">.env.local</code> on
              this machine — that takes priority and can't be changed from here. Remove{" "}
              <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded">XAI_API_KEY</code> from the
              env file if you'd rather manage it in-app.
            </p>
          </div>
        ) : (
          <>
            {status === "app" ? (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <p>Key saved and working.</p>
                </div>
                <button
                  onClick={removeKey}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Not set. X radar on Leads and the Grok option in Home chat stay off until you add
                one — everything else works fine without it.
              </p>
            )}

            <form onSubmit={saveKey} className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={status === "app" ? "Replace with a new key…" : "xai-…"}
                className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
              />
              <button
                type="submit"
                disabled={saving || !keyInput.trim()}
                className="flex items-center gap-2 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-medium text-sm rounded-lg px-4 transition-colors shrink-0"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p className="text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}
        {saved && !error && <p className="text-sm text-green-400">Saved and verified against xAI's API.</p>}
      </div>

      <p className="text-xs text-gray-600 mt-4">
        Keys entered here are stored in your Firestore <code className="bg-black/50 px-1 py-0.5 rounded">settings</code> collection
        (server-only reads — never sent to the browser), not in a file on your machine. If that's a
        concern, use <code className="bg-black/50 px-1 py-0.5 rounded">.env.local</code> instead, which
        this screen will detect and defer to automatically.
      </p>
    </div>
  );
}
