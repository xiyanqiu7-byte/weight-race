import type { Slot } from "./types";

const KEY = "weight-race-enter-draft";

export type EnterDraft = {
  slot: Slot;
  nickname: string;
  phrase: string;
};

export function loadEnterDraft(): EnterDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EnterDraft>;
    if (
      typeof parsed.nickname !== "string" ||
      typeof parsed.phrase !== "string" ||
      (parsed.slot !== "a" &&
        parsed.slot !== "b" &&
        parsed.slot !== "c" &&
        parsed.slot !== "d")
    ) {
      return null;
    }
    return {
      slot: parsed.slot,
      nickname: parsed.nickname,
      phrase: parsed.phrase,
    };
  } catch {
    return null;
  }
}

export function saveEnterDraft(draft: EnterDraft): void {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearEnterDraft(): void {
  sessionStorage.removeItem(KEY);
}
