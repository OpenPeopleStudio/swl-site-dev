import { ensureOwner } from "@/apps/owner-console/lib/ensureOwner";
import { SiteShell } from "@/components/design/SiteShell";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export const metadata = {
  title: "Owner Settings",
};

export default async function OwnerSettingsPage() {
  await ensureOwner();

  return (
    <SiteShell className="text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-5 lg:px-6">
        <header className="space-y-3">
          <p className="text-[0.65rem] uppercase tracking-[0.45em] text-white/40">Owner Console · Settings</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">System preferences</h1>
              <p className="text-sm text-white/60">
                Breadcrumbs: identity → access → notifications → behavior → system.
              </p>
            </div>
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white/60">
              SettingsOS
            </span>
          </div>
        </header>

        <SettingsWorkspace role="owner" />
      </div>
    </SiteShell>
  );
}
