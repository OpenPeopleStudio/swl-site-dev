"use client";

interface MetricGlyphProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export function MetricGlyph({ label, value, unit, className = "" }: MetricGlyphProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-light">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-light text-white/90 tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-white/40 font-light">{unit}</span>
        )}
      </div>
    </div>
  );
}
