import { ensureOwner } from "@/apps/owner-console/lib/ensureOwner";
import OwnerSchedulingConsole from "@/apps/staff-console/owner/OwnerSchedulingConsole";
import { StarField } from "@/components/design/StarField";

export default async function OwnerConsolePage() {
  await ensureOwner();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white" data-shell="owner">
      <StarField className="-z-10 opacity-70 pointer-events-none" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-5 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <p className="text-[0.65rem] uppercase tracking-[0.45em] text-white/50">Owner Console</p>
          <div className="mt-3 space-y-2">
            <h1 className="text-3xl font-light tracking-[0.25em]">
              Mission Control · Snow White Laundry
            </h1>
            <p className="text-sm text-white/60">
              Private scheduling cockpit for Tom + Ken — forecast, build, delegate, and feel the pulse.
            </p>
          </div>
        </header>
        <OwnerSchedulingConsole />
      </div>
    </main>
  );
}
