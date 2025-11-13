"use client";

import { useEffect, useMemo, useState } from "react";

export type PrivateDiningRequest = {
  id: string;
  guestName: string;
  guestEmail: string;
  partySize: number;
  status: RequestStatus;
  preferredDate?: string | null;
  inspiration?: string | null;
  dietaryNotes?: string | null;
  internalNotes?: string | null;
  guestFacingNotes?: string | null;
  budgetRange?: string | null;
};

export type ContractAgreement = {
  id: string;
  requestId: string;
  amount: string;
  dueDate: string;
  status: "draft" | "sent" | "viewed" | "signed";
  updatedAt: string;
  documentUrl?: string | null;
};

export type RequestStatus =
  | "inquiry"
  | "curation"
  | "awaiting_guest"
  | "contract_out"
  | "confirmed";

type StaffEventsWorkspaceProps = {
  requests: PrivateDiningRequest[];
  contracts: ContractAgreement[];
  onUpdateRequest?: (
    id: string,
    payload: { status: RequestStatus; internalNotes: string; guestFacingNotes: string },
  ) => Promise<void> | void;
  onSendContract?: (contractId: string) => Promise<void> | void;
  onSignContract?: (contractId: string) => Promise<void> | void;
};

const COLUMN_ORDER: RequestStatus[] = [
  "inquiry",
  "curation",
  "awaiting_guest",
  "contract_out",
  "confirmed",
];

export function StaffEventsWorkspace({
  requests,
  contracts,
  onUpdateRequest,
  onSendContract,
  onSignContract,
}: StaffEventsWorkspaceProps) {
  const [activeRequestId, setActiveRequestId] = useState<string | null>(
    () => requests[0]?.id ?? null,
  );
  const [draftStatus, setDraftStatus] = useState<RequestStatus>("inquiry");
  const [internalNotes, setInternalNotes] = useState("");
  const [guestFacingNotes, setGuestFacingNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);

  const grouped = useMemo(() => {
    return COLUMN_ORDER.reduce<Record<RequestStatus, PrivateDiningRequest[]>>(
      (acc, status) => {
        acc[status] = requests.filter((request) => request.status === status);
        return acc;
      },
      {
        inquiry: [],
        curation: [],
        awaiting_guest: [],
        contract_out: [],
        confirmed: [],
      },
    );
  }, [requests]);

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) ?? null,
    [requests, activeRequestId],
  );

  const activeContract = useMemo(
    () =>
      contracts.find((contract) => contract.requestId === activeRequestId) ?? null,
    [contracts, activeRequestId],
  );

  useEffect(() => {
    if (!activeRequest) return;
    setDraftStatus(activeRequest.status);
    setInternalNotes(activeRequest.internalNotes ?? "");
    setGuestFacingNotes(activeRequest.guestFacingNotes ?? "");
  }, [activeRequest]);

  async function handlePersist() {
    if (!activeRequest) return;
    setSaving(true);
    try {
      await onUpdateRequest?.(activeRequest.id, {
        status: draftStatus,
        internalNotes,
        guestFacingNotes,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleContractAction(
    intent: "send" | "sign",
    contractId: string | undefined,
  ) {
    if (!contractId) return;
    setContractBusy(true);
    try {
      if (intent === "send") {
        await onSendContract?.(contractId);
      } else {
        await onSignContract?.(contractId);
      }
    } finally {
      setContractBusy(false);
    }
  }

  const totals = useMemo(() => {
    const pipeline = COLUMN_ORDER.map((status) => ({
      status,
      count: grouped[status].length,
    }));
    return {
      totalRequests: requests.length,
      signedContracts: contracts.filter((contract) => contract.status === "signed")
        .length,
      pipeline,
    };
  }, [requests, grouped, contracts]);

  return (
    <section className="flex flex-col gap-8 rounded-[40px] border border-white/10 bg-gradient-to-b from-[#04070f]/90 via-[#020409]/95 to-[#010206]/98 p-8 text-white shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">
            Staff · Private Dining
          </p>
          <h1 className="mt-2 text-4xl font-light tracking-[0.25em]">
            Events Command Surface
          </h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <StatPill label="Active Requests" value={totals.totalRequests} />
          <StatPill label="Contracts Signed" value={totals.signedContracts} tone="calm" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_minmax(340px,1fr)]">
        <div className="space-y-6">
          <PipelineLegend pipeline={totals.pipeline} />
          <div className="grid gap-4 lg:grid-cols-5">
            {COLUMN_ORDER.map((status) => (
              <RequestColumn
                key={status}
                title={statusLabel(status)}
                tone={statusTone(status)}
                requests={grouped[status]}
                activeId={activeRequestId}
                onSelect={setActiveRequestId}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <EditingPanel
            request={activeRequest}
            draftStatus={draftStatus}
            internalNotes={internalNotes}
            guestFacingNotes={guestFacingNotes}
            onStatusChange={setDraftStatus}
            onInternalChange={setInternalNotes}
            onGuestChange={setGuestFacingNotes}
            onPersist={handlePersist}
            saving={saving}
          />

          <ContractPanel
            request={activeRequest}
            contract={activeContract}
            busy={contractBusy}
            onSend={() => handleContractAction("send", activeContract?.id)}
            onSign={() => handleContractAction("sign", activeContract?.id)}
          />
        </div>
      </div>
    </section>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "calm";
}) {
  const styles =
    tone === "calm"
      ? "border-emerald-300/30 text-emerald-100 bg-emerald-500/10"
      : "border-white/15 text-white";
  return (
    <div className={`rounded-3xl border px-6 py-3 text-center ${styles}`}>
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-light">{value}</p>
    </div>
  );
}

function PipelineLegend({
  pipeline,
}: {
  pipeline: { status: RequestStatus; count: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
      {pipeline.map((item) => (
        <div key={item.status} className="flex items-center gap-3">
          <span
            className={`inline-flex h-3 w-3 rounded-full ${statusTone(item.status).dot}`}
          />
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {statusLabel(item.status)} · {item.count}
          </p>
        </div>
      ))}
    </div>
  );
}

function RequestColumn({
  title,
  tone,
  requests,
  activeId,
  onSelect,
}: {
  title: string;
  tone: ReturnType<typeof statusTone>;
  requests: PrivateDiningRequest[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`rounded-3xl border ${tone.column} p-3`}>
      <p
        className={`text-center text-[11px] uppercase tracking-[0.4em] ${tone.label}`}
      >
        {title}
      </p>
      <div className="mt-3 space-y-3">
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-3 text-center text-xs text-white/40">
            Awaiting signals
          </p>
        ) : (
          requests.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => onSelect(request.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                activeId === request.id
                  ? "border-white/60 bg-white/10"
                  : "border-white/10 bg-white/5 hover:border-white/40"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                {request.guestName}
              </p>
              <p className="mt-1 text-base font-light text-white">
                {request.partySize} guests · {request.budgetRange ?? "Custom"}
              </p>
              {request.preferredDate && (
                <p className="text-xs text-white/60">
                  {formatDate(request.preferredDate)}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EditingPanel({
  request,
  draftStatus,
  internalNotes,
  guestFacingNotes,
  onStatusChange,
  onInternalChange,
  onGuestChange,
  onPersist,
  saving,
}: {
  request: PrivateDiningRequest | null;
  draftStatus: RequestStatus;
  internalNotes: string;
  guestFacingNotes: string;
  onStatusChange: (status: RequestStatus) => void;
  onInternalChange: (value: string) => void;
  onGuestChange: (value: string) => void;
  onPersist: () => void;
  saving: boolean;
}) {
  if (!request) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
        Select a request to begin editing.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">
            Editing — {request.guestName}
          </p>
          <p className="text-sm text-white/70">{request.guestEmail}</p>
        </div>
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
          {request.partySize} guests
        </span>
      </header>

      <div className="mt-6 space-y-4">
        <label className="block text-xs uppercase tracking-[0.35em] text-white/50">
          Status
          <select
            className="mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white"
            value={draftStatus}
            onChange={(event) => onStatusChange(event.target.value as RequestStatus)}
          >
            {COLUMN_ORDER.map((status) => (
              <option key={status} value={status} className="bg-black text-white">
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs uppercase tracking-[0.35em] text-white/50">
          Internal Notes
          <textarea
            className="mt-2 h-28 w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white"
            value={internalNotes}
            onChange={(event) => onInternalChange(event.target.value)}
            placeholder="Chef intel, sourcing updates, budget constraints…"
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.35em] text-white/50">
          Guest Update Preview
          <textarea
            className="mt-2 h-28 w-full resize-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white"
            value={guestFacingNotes}
            onChange={(event) => onGuestChange(event.target.value)}
            placeholder="Hi, just a quick note on your menu design..."
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-white/60">
          This copy is surfaced directly in the guest portal and recap emails.
        </div>
        <button
          type="button"
          onClick={onPersist}
          disabled={saving}
          className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-white/80 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save + Notify Guest"}
        </button>
      </div>
    </div>
  );
}

function ContractPanel({
  request,
  contract,
  busy,
  onSend,
  onSign,
}: {
  request: PrivateDiningRequest | null;
  contract: ContractAgreement | null;
  busy: boolean;
  onSend: () => void;
  onSign: () => void;
}) {
  if (!request) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/0 p-6 text-center text-white/50">
        Select a request to review contract status.
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-3xl border border-white/15 bg-black/30 p-6 text-center text-white/70">
        <p className="text-sm">
          No contract packaged yet. Draft one from your CRM and drop it into the legal
          queue to sync here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Signature Flow
          </p>
          <h3 className="text-2xl font-light text-white">
            {currency(contract.amount)} · due {formatDate(contract.dueDate)}
          </h3>
        </div>
        <span className={`rounded-full px-4 py-1 text-xs ${contractTone(contract.status)}`}>
          {contract.status.replace("_", " ")}
        </span>
      </header>

      <ol className="mt-6 space-y-3">
        {["draft", "sent", "viewed", "signed"].map((step) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          >
            <span
              className={`h-8 w-8 rounded-full text-center text-xs uppercase tracking-[0.3em] leading-8 ${stepTone(
                contract.status,
                step as ContractAgreement["status"],
              )}`}
            >
              {step === "draft" ? "D" : step === "sent" ? "S" : step === "viewed" ? "V" : "✓"}
            </span>
            <div>
              <p className="text-white">{stepLabel(step)}</p>
              {contract.status === step && (
                <p className="text-xs text-white/60">
                  Updated {new Date(contract.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        {contract.status === "draft" && (
          <button
            type="button"
            disabled={busy}
            onClick={onSend}
            className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white hover:border-white/80 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Signature Packet"}
          </button>
        )}
        {contract.status === "viewed" && (
          <button
            type="button"
            disabled={busy}
            onClick={onSign}
            className="rounded-full border border-white/40 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white hover:border-white/80 disabled:opacity-50"
          >
            {busy ? "Syncing…" : "Mark As Signed"}
          </button>
        )}
        {contract.documentUrl && (
          <a
            href={contract.documentUrl}
            className="rounded-full border border-white/25 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white/70 hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            View Latest Draft
          </a>
        )}
      </div>
    </div>
  );
}

function statusLabel(status: RequestStatus) {
  switch (status) {
    case "inquiry":
      return "Inquiry";
    case "curation":
      return "Menu Curation";
    case "awaiting_guest":
      return "Awaiting Guest";
    case "contract_out":
      return "Contract Out";
    case "confirmed":
      return "Confirmed";
    default:
      return status;
  }
}

function statusTone(status: RequestStatus) {
  switch (status) {
    case "inquiry":
      return {
        column: "border-white/10 bg-white/5",
        label: "text-white/60",
        dot: "bg-white/50",
      };
    case "curation":
      return {
        column: "border-amber-400/20 bg-amber-500/5",
        label: "text-amber-200",
        dot: "bg-amber-300",
      };
    case "awaiting_guest":
      return {
        column: "border-cyan-400/20 bg-cyan-500/5",
        label: "text-cyan-100",
        dot: "bg-cyan-300",
      };
    case "contract_out":
      return {
        column: "border-blue-400/20 bg-blue-500/5",
        label: "text-blue-100",
        dot: "bg-blue-300",
      };
    case "confirmed":
      return {
        column: "border-emerald-400/25 bg-emerald-500/5",
        label: "text-emerald-100",
        dot: "bg-emerald-300",
      };
    default:
      return {
        column: "border-white/10 bg-white/5",
        label: "text-white/60",
        dot: "bg-white/50",
      };
  }
}

function contractTone(status: ContractAgreement["status"]) {
  switch (status) {
    case "draft":
      return "border border-amber-300/40 bg-amber-400/10 text-amber-100";
    case "sent":
      return "border border-blue-300/40 bg-blue-400/10 text-blue-100";
    case "viewed":
      return "border border-cyan-300/40 bg-cyan-400/10 text-cyan-100";
    case "signed":
      return "border border-emerald-300/60 bg-emerald-400/10 text-emerald-100";
    default:
      return "border border-white/20";
  }
}

function stepTone(
  current: ContractAgreement["status"],
  step: ContractAgreement["status"],
) {
  const states = ["draft", "sent", "viewed", "signed"];
  const currentIdx = states.indexOf(current);
  const stepIdx = states.indexOf(step);
  if (stepIdx < currentIdx) {
    return "bg-white/30 text-black";
  }
  if (stepIdx === currentIdx) {
    return "bg-white text-black";
  }
  return "bg-white/10 text-white/40";
}

function stepLabel(step: string) {
  switch (step) {
    case "draft":
      return "Draft ready";
    case "sent":
      return "Packet sent";
    case "viewed":
      return "Client viewed";
    case "signed":
      return "Signed + archived";
    default:
      return step;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function currency(amount: string) {
  if (!amount) return "—";
  if (Number.isNaN(Number(amount))) return amount;
  return Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export default StaffEventsWorkspace;
