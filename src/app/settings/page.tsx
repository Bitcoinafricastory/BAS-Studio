"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, KeyRound, Trash2, AlertTriangle, Lock } from "lucide-react";

type Status = "env" | "app" | "none" | null;

interface FieldConfig {
  key: "anthropicApiKey" | "xaiApiKey" | "passcode";
  title: string;
  icon: typeof KeyRound;
  envVarName: string;
  placeholder: string;
  inputType: "password" | "text";
  description: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: "anthropicApiKey",
    title: "Anthropic (Claude) API key",
    icon: KeyRound,
    envVarName: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-…",
    inputType: "password",
    description:
      "Powers drafting, research, and the Claude option in Home chat. Nothing in the app works without this one.",
  },
  {
    key: "xaiApiKey",
    title: "xAI (Grok) API key",
    icon: KeyRound,
    envVarName: "XAI_API_KEY",
    placeholder: "xai-…",
    inputType: "password",
    description: "Powers X radar on Leads and the Grok option in Home chat. Optional — everything else works without it.",
  },
  {
    key: "passcode",
    title: "Passcode",
    icon: Lock,
    envVarName: "BAS_STUDIO_PASSCODE",
    placeholder: "Choose a passcode…",
    inputType: "password",
    description: "Gates the whole app. Changing this only affects new logins — you'll stay signed in on this device.",
  },
];

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatuses(data);
    } catch (err: any) {
      setErrors((e) => ({ ...e, _global: err.message }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveField(key: string) {
    const value = inputs[key]?.trim();
    if (!value || saving) return;
    setSaving(key);
    setErrors((e) => ({ ...e, [key]: "" }));
    setSaved((s) => ({ ...s, [key]: false }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setInputs((i) => ({ ...i, [key]: "" }));
      setSaved((s) => ({ ...s, [key]: true }));
      await load();
    } catch (err: any) {
      setErrors((e) => ({ ...e, [key]: err.message }));
    } finally {
      setSaving(null);
    }
  }

  async function removeField(key: string) {
    setSaving(key);
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch(`/api/settings?field=${key}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      await load();
    } catch (err: any) {
      setErrors((e) => ({ ...e, [key]: err.message }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-gray-50 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">API keys and access — no Vercel dashboard needed.</p>

      <div className="flex flex-col gap-4">
        {FIELDS.map((field) => {
          const status = statuses[field.key];
          const Icon = field.icon;
          return (
            <div key={field.key} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-bas-gold shrink-0" />
                <h2 className="text-sm font-semibold text-gray-100">{field.title}</h2>
              </div>
              <p className="text-xs text-gray-500">{field.description}</p>

              {loading ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" /> Checking status…
                </p>
              ) : status === "env" ? (
                <div className="flex items-start gap-2 text-sm text-green-400">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <p>
                    Set via <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded">.env.local</code> — that
                    takes priority and can't be changed here. Remove{" "}
                    <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded">{field.envVarName}</code> from the
                    env file to manage it from this screen instead.
                  </p>
                </div>
              ) : (
                <>
                  {status === "app" ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <p>Set and working.</p>
                      </div>
                      <button
                        onClick={() => removeField(field.key)}
                        disabled={saving === field.key}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Not set.</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type={field.inputType}
                      value={inputs[field.key] || ""}
                      onChange={(e) => setInputs((i) => ({ ...i, [field.key]: e.target.value }))}
                      placeholder={status === "app" ? "Replace with a new value…" : field.placeholder}
                      className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
                    />
                    <button
                      onClick={() => saveField(field.key)}
                      disabled={saving === field.key || !inputs[field.key]?.trim()}
                      className="flex items-center gap-2 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-medium text-sm rounded-lg px-4 transition-colors shrink-0"
                    >
                      {saving === field.key ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                    </button>
                  </div>
                </>
              )}

              {errors[field.key] && (
                <p className="text-sm text-red-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {errors[field.key]}
                </p>
              )}
              {saved[field.key] && !errors[field.key] && (
                <p className="text-sm text-green-400">Saved and verified.</p>
              )}
            </div>
          );
        })}
      </div>

      {errors._global && <p className="text-sm text-red-400 mt-4">{errors._global}</p>}

      <p className="text-xs text-gray-600 mt-4">
        Values entered here are stored in your Firestore <code className="bg-black/50 px-1 py-0.5 rounded">settings</code> collection
        (server-only reads — never sent to the browser), not in a file on your machine. Firebase's own
        credentials can't be managed from here — they're what this storage itself depends on, so they
        have to stay in <code className="bg-black/50 px-1 py-0.5 rounded">.env.local</code> / Vercel.
      </p>
    </div>
  );
}
