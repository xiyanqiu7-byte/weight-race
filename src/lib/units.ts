/** 1 kg = 2 斤 */
export const JIN_PER_KG = 2;

export type Unit = "kg" | "jin";

export function kgToDisplay(kg: number, unit: Unit): number {
  return unit === "jin" ? kg * JIN_PER_KG : kg;
}

export function displayToKg(value: number, unit: Unit): number {
  return unit === "jin" ? value / JIN_PER_KG : value;
}

export function formatWeight(kg: number, unit: Unit = "kg", digits = 1): string {
  const v = kgToDisplay(kg, unit);
  return `${v.toFixed(digits)} ${unit === "jin" ? "斤" : "kg"}`;
}

export function lostKg(startKg: number | null, currentKg: number | null): number {
  if (startKg == null || currentKg == null) return 0;
  return Math.max(0, startKg - currentKg);
}

export function progressRatio(
  startKg: number | null,
  currentKg: number | null,
  goalKg: number,
): number {
  if (!goalKg) return 0;
  return Math.min(1, lostKg(startKg, currentKg) / goalKg);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
