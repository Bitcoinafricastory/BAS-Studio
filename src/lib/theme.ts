export type ThemeMode = "system" | "light" | "dark";
export const THEME_KEY = "bas-studio-theme";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(mode);
  root.dataset.themeMode = mode;
}

export function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

export function storeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {}
}

// Runs in <head> before first paint so the page never flashes the wrong theme.
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('${THEME_KEY}');if(m!=='light'&&m!=='dark')m='system';var l=m==='light'||(m==='system'&&window.matchMedia('(prefers-color-scheme: light)').matches);var r=document.documentElement;r.dataset.theme=l?'light':'dark';r.dataset.themeMode=m}catch(e){document.documentElement.dataset.theme='dark'}})();`;
