import type { Session } from "./types";

const KEY = "weight-race-session";
const UNIT_KEY = "weight-race-unit";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function loadUnit(): "kg" | "jin" {
  if (typeof window === "undefined") return "kg";
  const v = localStorage.getItem(UNIT_KEY);
  return v === "jin" ? "jin" : "kg";
}

export function saveUnit(unit: "kg" | "jin"): void {
  localStorage.setItem(UNIT_KEY, unit);
}
