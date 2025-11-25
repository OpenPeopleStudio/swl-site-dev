import { SettingsSection } from "../SettingsSection";
import type { NotificationSettings } from "../types";

type NotificationKey = keyof NotificationSettings;

type Props = {
  settings: NotificationSettings;
  onToggle: (key: NotificationKey, value: boolean) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  statusMessage?: string;
};

const channelConfig: { key: NotificationKey; label: string; helper: string }[] = [
  { key: "channelEmail", label: "Email", helper: "Shift digests + action summaries" },
  { key: "channelSms", label: "SMS", helper: "Urgent alerts · best for pacing" },
  { key: "channelInApp", label: "In-app", helper: "Quiet banners in StaffOS" },
];

const signalConfig: { key: NotificationKey; label: string; helper: string }[] = [
  { key: "scheduleChanges", label: "Schedule changes", helper: "Shifts swaps + callouts" },
  { key: "newReflections", label: "New reflections", helper: "Nightly reflections + notes" },
  { key: "eventReminders", label: "Event reminders", helper: "Wine dinners, takeovers, collabs" },
  { key: "inventoryAlerts", label: "Inventory alerts", helper: "Critical pars + shortages" },
  { key: "deviceAlerts", label: "Device alerts", helper: "Offline displays + docks" },
];

export function NotificationsSection({ settings, onToggle, onSave, saving, statusMessage }: Props) {
  async function handleSave() {
    await onSave();
  }

  return (
    <SettingsSection
      kicker="Notifications"
      title="Signals & channels"
      description="Choose channels first, then the signals you need to hear about. Owners inherit every alert."
    >
      <div className="space-y-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40">Channels</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {channelConfig.map((channel) => (
              <NotificationToggle
                key={channel.key}
                label={channel.label}
                helper={channel.helper}
                active={Boolean(settings[channel.key])}
                onClick={() => onToggle(channel.key, !settings[channel.key])}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40">Signals</p>
          <div className="mt-3 grid gap-3">
            {signalConfig.map((signal) => (
              <NotificationToggle
                key={signal.key}
                label={signal.label}
                helper={signal.helper}
                active={Boolean(settings[signal.key])}
                onClick={() => onToggle(signal.key, !settings[signal.key])}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40 whitespace-nowrap">
            Writes sync to Supabase · notification_settings
          </p>
          <div className="flex items-center gap-3">
            {statusMessage && <span className="text-xs text-white/60">{statusMessage}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full border border-cyan-400/50 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 transition hover:border-cyan-300 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save notifications"}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

function NotificationToggle({
  label,
  helper,
  active,
  onClick,
}: {
  label: string;
  helper: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        active ? "border-white/50 bg-white/[0.08]" : "border-white/10 hover:border-white/30"
      }`}
    >
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-white whitespace-nowrap truncate">{label}</p>
        <p className="text-xs text-white/50">{helper}</p>
      </div>
      <span
        className={`ml-4 whitespace-nowrap text-xs uppercase tracking-[0.35em] ${
          active ? "text-cyan-300" : "text-white/30"
        }`}
      >
        {active ? "On" : "Off"}
      </span>
    </button>
  );
}

