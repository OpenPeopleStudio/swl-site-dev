import { MenuItemRow } from "./MenuItemRow";
import type { MenuRowBusyState, MenuSection } from "@/types/menu";

const columnClasses =
  "grid grid-cols-[minmax(200px,1.2fr)_minmax(260px,1.5fr)_minmax(100px,0.6fr)_minmax(110px,0.6fr)_minmax(130px,0.8fr)_minmax(90px,0.6fr)] gap-x-6";

interface MenuSectionGroupProps {
  section: MenuSection;
  readonly?: boolean;
  rowBusyMap?: Record<string, MenuRowBusyState | undefined>;
  onToggleAvailability?: (itemId: string) => void;
  onToggleVisibility?: (itemId: string) => void;
  onRequestReorder?: (sectionId: string, itemId: string, direction: "up" | "down") => void;
  selectionState?: {
    isSelected: (itemId: string) => boolean;
    toggle: (itemId: string) => void;
  };
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MenuSectionGroup({
  section,
  readonly = false,
  rowBusyMap,
  onToggleAvailability,
  onToggleVisibility,
  onRequestReorder,
  selectionState,
  collapsed = false,
  onToggleCollapse,
}: MenuSectionGroupProps) {
  const note =
    section.serviceLabels.length > 0 ? section.serviceLabels.join(" • ") : section.notes;
  const allowActions = !readonly && Boolean(onToggleAvailability || onToggleVisibility || onRequestReorder);

  return (
    <section className="border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.35em] text-white/50 hover:border-white/50"
              aria-expanded={!collapsed}
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          )}
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 whitespace-nowrap">
            {section.name}
          </p>
          {note && <span className="text-xs text-white/40 whitespace-nowrap">{note}</span>}
        </div>
      </div>

      {collapsed ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
          Section collapsed
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <div className="min-w-[760px]">
            <div className={`${columnClasses} items-center border-b border-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-white/35`}>
              <span>Item</span>
              <span>Description</span>
              <span className="text-right">Price</span>
              <span>Status</span>
              <span>Tags · Station</span>
              <span className="text-right">{allowActions ? "Ops" : ""}</span>
            </div>
            <div className="divide-y divide-white/5">
              {section.items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  sectionId={section.id}
                  className={columnClasses}
                  item={item}
                  readonly={!allowActions}
                  busyAction={rowBusyMap?.[item.id]}
                  selection={
                    selectionState
                      ? {
                          selected: selectionState.isSelected(item.id),
                          onToggle: () => selectionState.toggle(item.id),
                        }
                      : undefined
                  }
                  onToggleAvailability={onToggleAvailability}
                  onToggleVisibility={onToggleVisibility}
                  onRequestReorder={onRequestReorder}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

