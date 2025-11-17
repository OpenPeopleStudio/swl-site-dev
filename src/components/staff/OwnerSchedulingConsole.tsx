"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  MessageCircle,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";

type StaffAvailability = {
  name: string;
  role: string;
  availability: string[];
  constraints: string;
  status: "ok" | "warning";
};

type ForecastMetric = {
  label: string;
  value: string;
  detail: string;
};

type ShiftDraft = {
  id: string;
  station: string;
  window: string;
  lead: string;
  status: "locked" | "draft";
  critical?: boolean;
};

type Task = {
  id: string;
  label: string;
  category: string;
  due: string;
  priority: "low" | "medium" | "high";
};

type PrepAlert = {
  label: string;
  detail: string;
  weight: "low" | "medium" | "high";
};

type TelemetryMetric = {
  label: string;
  value: string;
  subtitle: string;
  tone: "calm" | "warn";
};

type ScheduleBlock = {
  id: string;
  label: string;
  window: string;
  owner: string;
  status: "locked" | "draft" | "needs_review";
  dependencies: string[];
};

type OwnerRequest = {
  id: string;
  requester: string;
  type: "shift_change" | "reservation_add" | "task";
  detail: string;
  target_window: string;
  priority: "normal" | "urgent";
};

const STAFF_AVAILABILITY: StaffAvailability[] = [
  {
    name: "Noor",
    role: "FOH Captain",
    availability: ["✔", "✔", "—", "✔", "✔", "PM", "AM"],
    constraints: "Night classes Tue",
    status: "ok",
  },
  {
    name: "Mika",
    role: "Pastry",
    availability: ["AM", "AM", "AM", "—", "AM", "—", "AM"],
    constraints: "No dairy plating",
    status: "warning",
  },
  {
    name: "Ander",
    role: "Bar",
    availability: ["PM", "PM", "PM", "PM", "—", "—", "—"],
    constraints: "Travel Sun/Mon",
    status: "ok",
  },
];

const FORECAST: ForecastMetric[] = [
  { label: "Projected Covers", value: "124", detail: "+18 vs last week" },
  { label: "FOH Load Index", value: "0.82", detail: "Stable · slight peak at 20:00" },
  { label: "BOH Stress", value: "0.66", detail: "Under control" },
  { label: "Dietary Complexity", value: "19 flags", detail: "High dairy-free Friday" },
];

const SHIFT_DRAFTS: ShiftDraft[] = [
  {
    id: "shift-1",
    station: "Line · Experience B",
    window: "15:00 – 23:30",
    lead: "Koa",
    status: "locked",
    critical: true,
  },
  {
    id: "shift-2",
    station: "Host / Concierge",
    window: "14:00 – 22:00",
    lead: "Ezra",
    status: "draft",
  },
  {
    id: "shift-3",
    station: "Pastry Lab",
    window: "12:00 – 20:00",
    lead: "Mina",
    status: "draft",
  },
];

const TASKS: Task[] = [
  {
    id: "task-1",
    label: "Update Rivera contract with new pairing tier",
    category: "FOH upkeep",
    due: "Today · 19:00",
    priority: "high",
  },
  {
    id: "task-2",
    label: "Calibrate vent sensors in prep kitchen",
    category: "Maintenance",
    due: "Tomorrow · 11:00",
    priority: "medium",
  },
  {
    id: "task-3",
    label: "AI tasting brief for weekend menu",
    category: "AI-training",
    due: "Fri · 09:30",
    priority: "medium",
  },
];

const PREP_ALERTS: PrepAlert[] = [
  {
    label: "High dairy-free load Friday",
    detail: "12 guests require alternative dessert base",
    weight: "high",
  },
  {
    label: "Shellfish sequences Sat",
    detail: "Prep 30 extra prawns · 6 vegan swaps",
    weight: "medium",
  },
  {
    label: "Weather shift",
    detail: "Expect patio closure · re-route FOH",
    weight: "low",
  },
];

const TELEMETRY: TelemetryMetric[] = [
  { label: "Staff Sentiment", value: "7.8", subtitle: "Stable", tone: "calm" },
  { label: "Burnout Watch", value: "Moderate", subtitle: "Pastry team", tone: "warn" },
  { label: "Overtime Risk", value: "Low", subtitle: "0.3 hrs avg", tone: "calm" },
  { label: "Vibe Index", value: "84", subtitle: "Guests trending up", tone: "calm" },
];

const SCHEDULE_BLOCKS: ScheduleBlock[] = [
  {
    id: "block-1",
    label: "Experience B · Seating 1",
    window: "17:15 – 19:45",
    owner: "Ezra",
    status: "locked",
    dependencies: ["Greeting", "Pacing", "Reset"],
  },
  {
    id: "block-2",
    label: "Private Event · Salon",
    window: "19:00 – 23:00",
    owner: "Tom",
    status: "needs_review",
    dependencies: ["Prep timeline", "Briefing", "Breakdown"],
  },
  {
    id: "block-3",
    label: "Line Shift · Crew A",
    window: "15:00 – 23:30",
    owner: "Koa",
    status: "locked",
    dependencies: ["Prep duties", "Cleanup"],
  },
  {
    id: "block-4",
    label: "Inventory Cycle · Spirits",
    window: "23:45 – 01:15",
    owner: "Ken",
    status: "draft",
    dependencies: ["Stock count", "Device sync"],
  },
];

const REQUEST_QUEUE: OwnerRequest[] = [
  {
    id: "req-1",
    requester: "Mina",
    type: "shift_change",
    detail: "Trade pastry close with Noor for Friday due to family commitment.",
    target_window: "Friday · 18:00 – 23:00",
    priority: "normal",
  },
  {
    id: "req-2",
    requester: "Ezra",
    type: "reservation_add",
    detail: "Walk-in VIP asked for Saturday 19:15 · party of 2. Needs pacing block.",
    target_window: "Saturday · 19:15",
    priority: "urgent",
  },
  {
    id: "req-3",
    requester: "Theo",
    type: "task",
    detail: "Add detergent sensor calibration to Sunday cleaning blocks.",
    target_window: "Sunday · 00:30",
    priority: "normal",
  },
];

const CONTROL_ACTIONS = [
  { id: "lock", label: "Lock Schedule", icon: Lock, description: "Freeze safety + guest blocks" },
  { id: "generate", label: "Generate Dependencies", icon: RefreshCw, description: "Run block engine" },
  { id: "ritual", label: "Ritual Shield", icon: Shield, description: "Protect leadership cadence" },
];

const CHAT_MESSAGES = [
  {
    id: "msg-1",
    author: "Ken",
    timestamp: "17:12",
    body: "Rivera dinner wants earlier slot. Shift builder says we’re tight—can we reassign Mina to FOH overlap?",
  },
  {
    id: "msg-2",
    author: "Tom",
    timestamp: "17:14",
    body: "They’re owners tonight. Approve and flag as critical. I’ll adjust prep engine.",
  },
  {
    id: "msg-3",
    author: "Ken",
    timestamp: "17:15",
    body: "Copy, locking min staff and pushing contract reminder.",
  },
];

export function OwnerSchedulingConsole() {
  const [requestState, setRequestState] = useState<Record<string, "pending" | "approved" | "declined">>(
    () =>
      REQUEST_QUEUE.reduce(
        (acc, request) => {
          acc[request.id] = "pending";
          return acc;
        },
        {} as Record<string, "pending" | "approved" | "declined">,
      ),
  );

  const pendingCount = useMemo(
    () => REQUEST_QUEUE.filter((request) => requestState[request.id] === "pending").length,
    [requestState],
  );

  function handleDecision(id: string, decision: "approved" | "declined") {
    setRequestState((prev) => ({ ...prev, [id]: decision }));
  }

  return (
    <div className="space-y-6">
      <ScheduleControlStrip />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
        <OwnerTimelinePanel />
        <RequestQueuePanel requests={REQUEST_QUEUE} state={requestState} onDecision={handleDecision} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <ForecastPanel />
          <ShiftBuilderPanel />
          <AvailabilityPanel />
          <PrepPanel />
          <TaskPanel />
          <TelemetryPanel />
        </div>
        <ChatPanel pendingCount={pendingCount} />
      </div>
    </div>
  );
}

function ScheduleControlStrip() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-r from-[#05060d] via-[#050a16] to-[#03040a] p-5 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Cortex Schedule</p>
          <h1 className="text-3xl font-light tracking-[0.3em]">Owner authority · write enabled</h1>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-emerald-200">
          Full control
        </span>
      </header>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {CONTROL_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/40"
          >
            <div className="rounded-2xl border border-white/20 bg-black/30 p-3">
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">{action.label}</p>
              <p className="text-sm text-white/80">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function OwnerTimelinePanel() {
  return (
    <ConsolePanel title="Schedule Blocks · Owner Timeline">
      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
        Drag + approve blocks · dependencies locked once confirmed
      </p>
      <div className="mt-4 space-y-3">
        {SCHEDULE_BLOCKS.map((block) => (
          <div key={block.id} className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">{block.window}</p>
                <h3 className="text-xl text-white">{block.label}</h3>
                <p className="text-sm text-white/70">Owner: {block.owner}</p>
              </div>
              <BlockStatus status={block.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
              {block.dependencies.map((dep) => (
                <span key={`${block.id}-${dep}`} className="rounded-full border border-white/15 px-3 py-1">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ConsolePanel>
  );
}

function BlockStatus({ status }: { status: ScheduleBlock["status"] }) {
  const palette: Record<ScheduleBlock["status"], { label: string; tone: string }> = {
    locked: { label: "Locked", tone: "border-white/60 bg-white/10 text-white" },
    draft: { label: "Draft", tone: "border-white/20 text-white/60" },
    needs_review: { label: "Needs review", tone: "border-amber-400/40 bg-amber-400/10 text-amber-100" },
  };
  const appearance = palette[status];
  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4em] ${appearance.tone}`}>
      {appearance.label}
    </span>
  );
}

function RequestQueuePanel({
  requests,
  state,
  onDecision,
}: {
  requests: OwnerRequest[];
  state: Record<string, "pending" | "approved" | "declined">;
  onDecision: (id: string, decision: "approved" | "declined") => void;
}) {
  return (
    <ConsolePanel title="Staff Requests">
      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
        Staff console is view-only · approvals land here
      </p>
      <div className="mt-4 space-y-4">
        {requests.map((request) => {
          const decision = state[request.id];
          return (
            <div key={request.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    {request.requester} · {request.type.replace("_", " ")}
                  </p>
                  <p className="text-sm text-white/70">{request.target_window}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4em] ${
                    request.priority === "urgent"
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
                      : "border-white/20 text-white/60"
                  }`}
                >
                  {request.priority}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/80">{request.detail}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onDecision(request.id, "approved")}
                  className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
                    decision === "approved"
                      ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-200"
                      : "border-white/20 text-white/70 hover:border-white/50"
                  }`}
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => onDecision(request.id, "declined")}
                  className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
                    decision === "declined"
                      ? "border-rose-400/70 bg-rose-400/10 text-rose-200"
                      : "border-white/20 text-white/70 hover:border-white/50"
                  }`}
                >
                  <X className="h-4 w-4" /> Decline
                </button>
                {decision !== "pending" && (
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    {decision === "approved" ? "Queued for automation" : "Staff notified"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ConsolePanel>
  );
}

function ForecastPanel() {
  return (
    <ConsolePanel title="Demand Forecast & Labor Plan">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FORECAST.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">{metric.label}</p>
            <p className="mt-2 text-3xl font-light">{metric.value}</p>
            <p className="text-sm text-white/60">{metric.detail}</p>
          </div>
        ))}
      </div>
    </ConsolePanel>
  );
}

function ShiftBuilderPanel() {
  return (
    <ConsolePanel
      title="Shift Builder"
      actions={
        <div className="flex gap-3">
          <button className="rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white hover:border-white/70">
            Auto-fill
          </button>
          <button className="rounded-full border border-emerald-300/60 px-4 py-1 text-xs uppercase tracking-[0.4em] text-emerald-100 hover:border-emerald-200">
            Generate Briefing
          </button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {SHIFT_DRAFTS.map((shift) => (
          <div
            key={shift.id}
            className={`rounded-2xl border p-4 ${
              shift.status === "locked"
                ? "border-white/50 bg-white/10"
                : "border-white/10 bg-black/30"
            }`}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
              <span>{shift.window}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  shift.critical
                    ? "border border-white/70 text-white"
                    : "border border-white/30 text-white/60"
                }`}
              >
                {shift.critical ? "Critical" : shift.status}
              </span>
            </div>
            <p className="mt-2 text-lg font-light text-white">{shift.station}</p>
            <p className="text-sm text-white/70">Lead: {shift.lead}</p>
            <p className="mt-2 text-xs text-white/60">
              {shift.status === "locked" ? "Override allowed" : "Draft · drag to assign"}
            </p>
          </div>
        ))}
      </div>
    </ConsolePanel>
  );
}

function AvailabilityPanel() {
  return (
    <ConsolePanel title="Staff Availability & Constraints">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.4em] text-white/40">
              <th className="py-2">Staff</th>
              <th className="py-2">Role</th>
              <th className="py-2">Mon</th>
              <th className="py-2">Tue</th>
              <th className="py-2">Wed</th>
              <th className="py-2">Thu</th>
              <th className="py-2">Fri</th>
              <th className="py-2">Sat</th>
              <th className="py-2">Sun</th>
              <th className="py-2">Constraints</th>
            </tr>
          </thead>
          <tbody>
            {STAFF_AVAILABILITY.map((staff) => (
              <tr key={staff.name} className="border-t border-white/5 text-white/80">
                <td className="py-3">{staff.name}</td>
                <td className="py-3 text-white/60">{staff.role}</td>
                {staff.availability.map((slot, index) => (
                  <td key={`${staff.name}-slot-${index}`} className="py-3 text-center text-white/60">
                    {slot}
                  </td>
                ))}
                <td className="py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                      staff.status === "warning"
                        ? "border border-amber-300/50 text-amber-100"
                        : "border border-white/20 text-white/70"
                    }`}
                  >
                    {staff.constraints}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-3">
        <button className="rounded-full border border-white/25 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70 hover:border-white/60">
          Override slot
        </button>
        <button className="rounded-full border border-white/25 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70 hover:border-white/60">
          Lock role
        </button>
      </div>
    </ConsolePanel>
  );
}

function PrepPanel() {
  return (
    <ConsolePanel title="Prep Engine">
      <div className="grid gap-4 sm:grid-cols-2">
        {PREP_ALERTS.map((alert) => (
          <div
            key={alert.label}
            className={`rounded-2xl border p-4 ${
              alert.weight === "high"
                ? "border-rose-300/40 bg-rose-500/10"
                : alert.weight === "medium"
                  ? "border-amber-300/40 bg-amber-500/10"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">{alert.label}</p>
            <p className="mt-2 text-sm text-white">{alert.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Output</p>
        <p className="text-sm text-white/70">
          Mise sheets + load curve queued for BOH — waiting on Rivera contract confirmation.
        </p>
      </div>
    </ConsolePanel>
  );
}

function TaskPanel() {
  return (
    <ConsolePanel title="Micro-Task Delegation Engine">
      <ul className="space-y-3">
        {TASKS.map((task) => (
          <li key={task.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
              <span>{task.category}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  task.priority === "high"
                    ? "border border-rose-300/60 text-rose-100"
                    : task.priority === "medium"
                      ? "border border-amber-300/60 text-amber-100"
                      : "border border-white/20 text-white/70"
                }`}
              >
                {task.priority}
              </span>
            </div>
            <p className="mt-2 text-base text-white">{task.label}</p>
            <p className="text-xs text-white/60">{task.category}</p>
            <p className="text-xs text-white/40">{task.due}</p>
          </li>
        ))}
      </ul>
    </ConsolePanel>
  );
}

function TelemetryPanel() {
  return (
    <ConsolePanel title="Owner Pulse & Telemetry">
      <div className="grid gap-4 sm:grid-cols-2">
        {TELEMETRY.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-2xl border p-4 ${
              metric.tone === "warn"
                ? "border-amber-300/60 bg-amber-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">{metric.label}</p>
            <p className="mt-2 text-2xl font-light text-white">{metric.value}</p>
            <p className="text-xs text-white/60">{metric.subtitle}</p>
          </div>
        ))}
      </div>
    </ConsolePanel>
  );
}

function ConsolePanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-black/40 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-white/40">Panel</p>
          <h3 className="text-2xl font-light tracking-[0.2em] text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-full border border-white/15 p-2 text-white/70 hover:text-white"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </header>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

function ChatPanel({ pendingCount }: { pendingCount: number }) {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState("");

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: `owner-${timestamp}`, author: "Tom", timestamp, body: trimmed },
    ]);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col rounded-[34px] border border-white/10 bg-black/60 p-4">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-white/70">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4" />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Owner link</p>
            <p>Direct line · Ken ↔ Tom</p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.4em] text-white/60">
          {pendingCount} pending requests
        </span>
      </header>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex ${message.author === "Tom" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-3xl border px-4 py-3 text-sm ${
                message.author === "Tom"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-white/10 bg-black/40 text-white/80"
              }`}
            >
              <p className="text-white">{message.body}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
                {message.author} · {message.timestamp}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ping Ken…"
          className="flex-1 rounded-2xl border border-white/20 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
        />
        <button
          type="button"
          onClick={handleSend}
          className="rounded-2xl border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white hover:border-white/70"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default OwnerSchedulingConsole;
