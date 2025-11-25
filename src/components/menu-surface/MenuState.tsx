interface MenuStateProps {
  variant: "loading" | "empty" | "error";
  title: string;
  message: string;
}

export function MenuState({ variant, title, message }: MenuStateProps) {
  if (variant === "loading") {
    return (
      <div className="rounded-3xl border border-white/10 px-6 py-10 text-white/60">
        <p className="text-sm uppercase tracking-[0.4em] text-white/40">{title}</p>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonRow key={`menu-skeleton-${index}`} />
          ))}
        </div>
        <p className="mt-6 text-sm text-white/50">{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 px-6 py-10 text-white/70">
      <p className="text-sm uppercase tracking-[0.4em] text-white/40">{title}</p>
      <p className="mt-4 text-base font-medium text-white">{message}</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="grid grid-cols-[minmax(200px,1.2fr)_minmax(260px,1.5fr)_minmax(100px,0.6fr)_minmax(110px,0.6fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)] gap-4">
        <div className="space-y-2">
          <div className="h-3 rounded bg-white/10" />
          <div className="h-2 rounded bg-white/5" />
        </div>
        <div className="h-4 rounded bg-white/10" />
        <div className="h-4 rounded bg-white/15" />
        <div className="h-4 rounded bg-white/10" />
        <div className="h-4 rounded bg-white/5" />
        <div className="flex items-center justify-end gap-2">
          <div className="h-8 w-8 rounded-full border border-white/15 bg-white/5" />
          <div className="h-8 w-8 rounded-full border border-white/15 bg-white/5" />
          <div className="h-8 w-8 rounded-full border border-white/15 bg-white/5" />
        </div>
      </div>
    </div>
  );
}

