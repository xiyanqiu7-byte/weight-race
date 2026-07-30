"use client";

interface Props {
  value: number; // 0..1
  color: string;
  label: string;
  currentLabel?: string;
  startLabel?: string;
  goalLabel?: string;
  sublabel?: string;
}

/** 参考图 Weight Loss Plan：粗进度条 + 浮动胶囊标记 */
export function ProgressBar({
  value,
  color,
  label,
  currentLabel,
  startLabel,
  goalLabel,
  sublabel,
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  const markerLeft = Math.min(92, Math.max(8, pct));

  return (
    <div className="card-soft p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-bold tracking-tight">{label}</div>
          {sublabel && (
            <div className="mt-1 text-[12px] text-muted">{sublabel}</div>
          )}
        </div>
        <div className="rounded-full bg-sand px-3 py-1 text-[12px] font-semibold">
          {pct}%
        </div>
      </div>

      <div className="relative pt-8 pb-2">
        {currentLabel && (
          <div
            className="absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white shadow-md"
            style={{ left: `${markerLeft}%` }}
          >
            {currentLabel}
            <span
              className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink"
              aria-hidden
            />
          </div>
        )}

        <div className="relative h-3 overflow-visible rounded-full bg-[#d9d3cb]">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            }}
          />
          <div
            className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow"
            style={{ left: `${markerLeft}%` }}
          />
        </div>
      </div>

      {(startLabel || goalLabel) && (
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{startLabel}</span>
          <span>{goalLabel}</span>
        </div>
      )}
    </div>
  );
}
