// Light/dark theme: follows the OS by default; an explicit choice is remembered per browser.
export type ThemeChoice = "system" | "light" | "dark";
const KEY = "elham.theme";

export function readTheme(): ThemeChoice {
  try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "system"; } catch { return "system"; }
}
export function resolvedTheme(choice: ThemeChoice = readTheme()): "light" | "dark" {
  return choice === "system" ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
}
export function applyTheme(choice: ThemeChoice) {
  try { if (choice === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, choice); } catch { /* private mode */ }
  document.documentElement.dataset.theme = resolvedTheme(choice);
  document.documentElement.style.colorScheme = resolvedTheme(choice);
}
export function initTheme() {
  applyTheme(readTheme());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (readTheme() === "system") applyTheme("system"); });
}
