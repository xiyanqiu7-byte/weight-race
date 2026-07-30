"use client";

import { useMemo, useState } from "react";
import type { Unit } from "@/lib/units";

interface Props {
  unit: Unit;
  initial?: string;
  onSubmit: (value: number) => void;
  submitLabel?: string;
}

export function NumberPad({
  unit,
  initial = "",
  onSubmit,
  submitLabel = "保存",
}: Props) {
  const [raw, setRaw] = useState(initial);
  const display = useMemo(() => raw || "0", [raw]);

  function press(key: string) {
    if (key === "⌫") {
      setRaw((v) => v.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (raw.includes(".")) return;
      setRaw((v) => (v ? v + "." : "0."));
      return;
    }
    if (raw.replace(".", "").length >= 5) return;
    setRaw((v) => (v === "0" ? key : v + key));
  }

  function submit() {
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n <= 0 || n > 500) return;
    onSubmit(n);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  return (
    <div className="flex flex-col gap-3">
      <div className="card-soft px-4 py-6 text-center">
        <div className="text-4xl font-bold tracking-tight tabular-nums">
          {display}
        </div>
        <div className="mt-1 text-[12px] text-muted">
          {unit === "jin" ? "斤" : "kg"}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="pixel-btn py-3.5 text-[18px] font-semibold"
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="pixel-btn pixel-btn-primary w-full py-3.5 text-[15px]"
        onClick={submit}
        disabled={!raw || Number(raw) <= 0}
      >
        {submitLabel}
      </button>
    </div>
  );
}
