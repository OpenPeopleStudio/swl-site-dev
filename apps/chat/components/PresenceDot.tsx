"use client";

type PresenceDotProps = {
  state?: string | null;
};

export function PresenceDot({ state }: PresenceDotProps) {
  const color =
    state === "online"
      ? "bg-emerald-400"
      : state === "away"
        ? "bg-amber-400"
        : "bg-slate-500";
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full ${color} shadow-[0_0_8px_rgba(34,197,94,0.6)]`}
    />
  );
}

export default PresenceDot;
