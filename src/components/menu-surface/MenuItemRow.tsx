import { type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, PowerIcon } from "lucide-react";
import type { MenuItem, MenuRowBusyState } from "@/types/menu";

const STATUS_STYLES: Record<
  MenuItem["status"],
  { label: string; tone: string; dot: string }
> = {
  on: { label: "On", tone: "text-emerald-200 border-emerald-400/30", dot: "bg-emerald-300" },
  prep: { label: "Prep", tone: "text-amber-100 border-amber-400/30", dot: "bg-amber-300" },
  eightySixed: { label: "86'd", tone: "text-rose-200 border-rose-300/30", dot: "bg-rose-400" },
  testing: { label: "Testing", tone: "text-sky-200 border-sky-400/30", dot: "bg-sky-300" },
};

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface MenuItemRowProps {
  sectionId: string;
  item: MenuItem;
  className: string;
  readonly?: boolean;
  busyAction?: MenuRowBusyState;
  selection?: {
    selected: boolean;
    onToggle: () => void;
  };
  onToggleAvailability?: (itemId: string) => void;
  onToggleVisibility?: (itemId: string) => void;
  onRequestReorder?: (sectionId: string, itemId: string, direction: "up" | "down") => void;
}

export function MenuItemRow({
  sectionId,
  item,
  className,
  readonly = false,
  busyAction,
  selection,
  onToggleAvailability,
  onToggleVisibility,
  onRequestReorder,
}: MenuItemRowProps) {
  const statusToken = STATUS_STYLES[item.status];
  const hasActions = !readonly && Boolean(onToggleAvailability || onToggleVisibility || onRequestReorder);

  const availabilityHandler = onToggleAvailability
    ? () => onToggleAvailability(item.id)
    : undefined;
  const visibilityHandler = onToggleVisibility ? () => onToggleVisibility(item.id) : undefined;
  const reorderUpHandler =
    onRequestReorder && item
      ? () => onRequestReorder(sectionId, item.id, "up")
      : undefined;
  const reorderDownHandler =
    onRequestReorder && item
      ? () => onRequestReorder(sectionId, item.id, "down")
      : undefined;

  return (
    <div className={`${className} items-center px-4 py-3 text-sm text-white/80`}>
      <div className="flex items-start gap-2 whitespace-nowrap">
        {selection && (
          <button
            type="button"
            className={`mt-0.5 h-5 w-5 rounded-full border border-white/30 ${
              selection.selected ? "bg-white text-black" : "text-white/50"
            }`}
            aria-pressed={selection.selected}
            onClick={selection.onToggle}
          >
            {selection.selected && <span className="block h-2 w-2 rounded-full bg-black" />}
          </button>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-white/90 whitespace-nowrap truncate">{item.name}</p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">
            {item.serviceLabels.join(" / ")}
          </p>
        </div>
      </div>
      <p className="max-w-[360px] text-sm text-white/60 leading-snug">
        {item.shortDescription || "Awaiting description"}
      </p>
      <p className="text-right text-sm font-semibold text-white whitespace-nowrap">
        {PRICE_FORMATTER.format(item.price)}
      </p>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${statusToken.tone}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusToken.dot}`} />
          {statusToken.label}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-xs text-white/60">
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.4em]">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/20 px-2 py-0.5 whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 whitespace-nowrap">
          {item.station ?? "Station TBD"}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        {hasActions ? (
          <>
            {availabilityHandler && (
              <IconButton
                label="Toggle availability"
                onClick={availabilityHandler}
                loading={busyAction === "availability"}
              >
                <PowerIcon className="h-4 w-4" />
              </IconButton>
            )}
            {visibilityHandler && (
              <IconButton
                label="Toggle visibility"
                onClick={visibilityHandler}
                loading={busyAction === "visibility"}
              >
                <Eye className="h-4 w-4" />
              </IconButton>
            )}
            {onRequestReorder && (
              <div className="flex items-center gap-1">
                <IconButton
                  label="Move up"
                  onClick={reorderUpHandler}
                  loading={busyAction === "reorder"}
                >
                  <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Move down"
                  onClick={reorderDownHandler}
                  loading={busyAction === "reorder"}
                >
                  <ArrowDown className="h-4 w-4" />
                </IconButton>
              </div>
            )}
          </>
        ) : (
          <span className="text-xs uppercase tracking-[0.4em] text-white/30">—</span>
        )}
      </div>
    </div>
  );
}

interface IconButtonProps {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  loading?: boolean;
}

function IconButton({ children, label, onClick, loading = false }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
      aria-busy={loading}
      disabled={loading}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}

