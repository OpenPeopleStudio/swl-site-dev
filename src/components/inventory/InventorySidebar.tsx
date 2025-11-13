import Link from "next/link";
import { Circle } from "lucide-react";

export type InventorySidebarItem = {
  label: string;
  href: string;
  status?: "ok" | "warning" | "alert";
  badge?: string;
  isActive?: boolean;
};

type InventorySidebarProps = {
  sections: {
    title: string;
    items: InventorySidebarItem[];
  }[];
  footerText?: string;
};

export function InventorySidebar({ sections, footerText }: InventorySidebarProps) {
  return (
    <aside className="flex h-full w-full max-w-[260px] flex-col rounded-3xl border border-white/10 bg-black/50 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              {section.title}
            </p>
            <nav className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block"
                >
                  <div
                    className={`flex items-center justify-between rounded-2xl border border-white/5 px-3 py-2 text-sm text-white/70 transition ${
                      item.isActive
                        ? "border-white/30 bg-white/10 text-white"
                        : "hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Circle
                        className={`size-2.5 ${
                          item.status === "warning"
                            ? "text-amber-300"
                            : item.status === "alert"
                              ? "text-rose-400"
                              : "text-emerald-300"
                        }`}
                        fill={
                          item.status === "warning"
                            ? "#F5A524"
                            : item.status === "alert"
                              ? "#FB7185"
                              : "#34D399"
                        }
                      />
                      {item.label}
                    </div>
                    {item.badge && (
                      <span className="text-xs text-white/60">{item.badge}</span>
                    )}
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {footerText && (
        <p className="mt-auto text-xs text-white/40">
          {footerText}
        </p>
      )}
    </aside>
  );
}
