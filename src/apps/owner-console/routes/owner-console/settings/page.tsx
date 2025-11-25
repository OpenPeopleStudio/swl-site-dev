import { ensureOwner } from "@/apps/owner-console/lib/ensureOwner";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export const metadata = {
  title: "Owner Settings",
};

export default async function OwnerSettingsPage() {
  await ensureOwner();

  return (
    <main className="owner-shell min-h-screen bg-[#010206] text-white" data-shell="owner">
      <div className="owner-shell__inner space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Owner Settings</p>
          <h1 className="text-4xl font-light tracking-[0.25em]">System preferences & rituals</h1>
          <p className="text-white/60">
            Full visibility into preferences, integrations, security, and system-level tools.
          </p>
        </header>
        <SettingsWorkspace role="owner" />
      </div>
    </main>
  );
}
