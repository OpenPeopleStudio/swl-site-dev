import { useState } from "react";
import { ROLE_PERMISSION_SUMMARIES } from "@/components/settings/constants";
import { SettingsField, SettingsSection } from "../SettingsSection";
import type { AccessControlState, SettingsRole, StaffProfileSettings } from "../types";

type Props = {
  profile: StaffProfileSettings;
  roleLabel: string;
  accessControl: AccessControlState;
  saving: boolean;
  statusMessage?: string;
  onSubmitRequest: (payload: { requestedRole: SettingsRole; reason?: string }) => Promise<void> | void;
  onResolveRequest: (payload: { requestId: string; status: "approved" | "denied"; note?: string }) => Promise<void> | void;
};

export function AccessSection({
  profile,
  roleLabel,
  accessControl,
  saving,
  statusMessage,
  onSubmitRequest,
  onResolveRequest,
}: Props) {
  const summary = ROLE_PERMISSION_SUMMARIES[profile.role];
  const [requestedRole, setRequestedRole] = useState<SettingsRole>(profile.role);
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const pendingRequest = accessControl.myRequest;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestedRole || requestedRole === profile.role) return;
    onSubmitRequest({ requestedRole, reason: reason.trim() || undefined });
    setReason("");
  }

  function handleVerdict(
    requestId: string,
    verdict: "approved" | "denied",
  ) {
    onResolveRequest({
      requestId,
      status: verdict,
      note: reviewNotes[requestId]?.trim() || undefined,
    });
    setReviewNotes((prev) => ({ ...prev, [requestId]: "" }));
  }

  return (
    <SettingsSection
      kicker="Access"
      title="Roles & permissions"
      description="Role slices determine which panes load inside StaffOS and who can edit them."
    >
      <div className="space-y-6">
        <SettingsField label="Current role" helper="Only owners can alter staff roles directly.">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white">
            <span className="truncate whitespace-nowrap">{roleLabel}</span>
            <span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/40">{profile.role}</span>
          </div>
        </SettingsField>

        <SettingsField label="Capabilities">
          <ul className="space-y-2 text-sm text-white/70">
            {summary.capabilities.map((capability) => (
              <li key={capability} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" aria-hidden="true" />
                <span className="truncate">{capability}</span>
              </li>
            ))}
          </ul>
        </SettingsField>

        <SettingsField label="Escalation guidance">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60">
            {summary.escalation}
          </div>
        </SettingsField>

        {accessControl.canRequestChange && (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Request another slice</p>
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
                Target role
                <select
                  value={requestedRole}
                  onChange={(event) => setRequestedRole(event.target.value as SettingsRole)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white"
                >
                  {accessControl.availableRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
                Why now?
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-[80px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white"
                  placeholder="Calmly describe the work you want to unlock."
                />
              </label>
              <div className="flex items-center justify-between text-xs text-white/50">
                {pendingRequest?.status === "pending" ? (
                  <span className="uppercase tracking-[0.3em] text-amber-200">
                    Pending {pendingRequest.requestedRole.toUpperCase()}
                  </span>
                ) : (
                  <span className="uppercase tracking-[0.3em] text-white/40">Owner review within 24h</span>
                )}
                <button
                  type="submit"
                  disabled={saving || requestedRole === profile.role}
                  className="rounded-full border border-white/30 px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white hover:border-white/70 disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

        {pendingRequest && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/60">
            <p className="font-semibold text-white">
              {pendingRequest.status === "pending" ? "Awaiting owner review" : "Resolved"}
            </p>
            <p>
              {pendingRequest.status === "pending"
                ? `Requesting ${pendingRequest.requestedRole.toUpperCase()} · submitted ${new Date(pendingRequest.createdAt).toLocaleString()}`
                : `${pendingRequest.status.toUpperCase()} · ${pendingRequest.reviewerName ?? "Owner"}`}
            </p>
            {pendingRequest.resolutionNote && <p className="mt-2 text-white/70">{pendingRequest.resolutionNote}</p>}
          </div>
        )}

        {accessControl.canReviewChange && accessControl.queue.length > 0 && (
          <div className="space-y-3 rounded-3xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Pending queue</p>
            <ul className="space-y-3">
              {accessControl.queue.map((request) => (
                <li key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>{request.staffName}</span>
                    <span>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="mt-1 text-sm text-white">
                    {request.currentRole.toUpperCase()} → {request.requestedRole.toUpperCase()}
                  </p>
                  {request.reason && <p className="mt-2 text-xs text-white/60">{request.reason}</p>}
                  <textarea
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(event) =>
                      setReviewNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
                    placeholder="Optional note"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleVerdict(request.id, "approved")}
                      className="rounded-full border border-emerald-400/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-emerald-200 hover:border-emerald-300 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleVerdict(request.id, "denied")}
                      className="rounded-full border border-rose-400/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-rose-200 hover:border-rose-300 disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-white/10 pt-4 text-xs uppercase tracking-[0.3em] text-white/40">
          {statusMessage ?? "Role changes sync via Supabase.role_change_requests"}
        </div>
      </div>
    </SettingsSection>
  );
}

