import { listEventPipeline, type PrivateEvent } from "@/apps/events/lib/queries";
import {
  StaffEventsWorkspace,
  type ContractAgreement as WorkspaceContract,
  type PrivateDiningRequest as WorkspaceRequest,
  type RequestStatus,
} from "@/components/staff/StaffEventsWorkspace";

export default async function StaffEventsPage() {
  const events = await listEventPipeline(60);

  const requests: WorkspaceRequest[] = events.map(toWorkspaceRequest);
  const contracts: WorkspaceContract[] = events
    .map(toWorkspaceContract)
    .filter((contract): contract is WorkspaceContract => contract !== null);

  return (
    <div className="w-full">
      <StaffEventsWorkspace requests={requests} contracts={contracts} />
    </div>
  );
}

function toWorkspaceRequest(event: PrivateEvent): WorkspaceRequest {
  return {
    id: event.id,
    guestName: event.guest_name ?? "Unknown Guest",
    guestEmail: event.guest_email ?? "unknown@snowwhitelaundry.com",
    partySize: event.party_size ?? 0,
    status: mapStatus(event.status),
    preferredDate: event.preferred_date,
    inspiration: event.special_requests ?? null,
    dietaryNotes: event.special_requests ?? null,
    internalNotes: event.notes_internal ?? undefined,
    guestFacingNotes: event.proposal_text ?? undefined,
    budgetRange: event.budget_range ?? undefined,
  };
}

function toWorkspaceContract(event: PrivateEvent): WorkspaceContract | null {
  const hasContractSignal =
    Boolean(event.proposal_pdf_url) ||
    typeof event.deposit_amount === "number" ||
    ["proposal_sent", "contract_signed"].includes(event.status);

  if (!hasContractSignal) {
    return null;
  }

  return {
    id: `${event.id}-contract`,
    requestId: event.id,
    amount: `${event.deposit_amount ?? 0}`,
    dueDate: event.preferred_date ?? event.updated_at ?? new Date().toISOString(),
    status: mapContractStatus(event),
    updatedAt: event.updated_at ?? event.created_at ?? new Date().toISOString(),
    documentUrl: event.proposal_pdf_url ?? null,
  };
}

function mapStatus(status?: string | null): RequestStatus {
  switch (status) {
    case "curation":
      return "curation";
    case "awaiting_guest":
      return "awaiting_guest";
    case "proposal_sent":
    case "contract_out":
      return "contract_out";
    case "contract_signed":
    case "deposit_paid":
    case "confirmed":
    case "completed":
      return "confirmed";
    default:
      return "inquiry";
  }
}

function mapContractStatus(event: PrivateEvent): WorkspaceContract["status"] {
  if (event.deposit_paid || ["contract_signed", "completed"].includes(event.status)) {
    return "signed";
  }
  if (event.status === "proposal_sent" || event.status === "contract_out") {
    return "sent";
  }
  return "draft";
}
