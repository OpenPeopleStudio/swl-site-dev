import type {
  PosTicket,
  PosTicketLine,
  TableBlock,
  TableDefinition,
  TableStatus,
} from "@/types/pos";

const STATUS_MAP: Record<string, TableStatus> = {
  ordering: "ordering",
  draft: "ordering",
  coursing: "ordering",
  served: "served",
  paying: "paying",
};

function minutesSince(timestamp?: string | null) {
  if (!timestamp) return undefined;
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 0;
  return Math.round(diffMs / 60000);
}

function summarizeLines(lines: PosTicketLine[]) {
  return lines.reduce(
    (acc, line) => {
      const lineTotal = line.price * line.qty;
      return {
        subtotal: acc.subtotal + lineTotal,
        compTotal: acc.compTotal + (line.comp ? lineTotal : 0),
      };
    },
    { subtotal: 0, compTotal: 0 },
  );
}

export function deriveTableBlocks(
  definitions: TableDefinition[],
  tickets: PosTicket[],
  ticketLines: PosTicketLine[],
): TableBlock[] {
  const linesByTicket = ticketLines.reduce<Record<string, PosTicketLine[]>>(
    (acc, line) => {
      acc[line.ticketId] = [...(acc[line.ticketId] ?? []), line];
      return acc;
    },
    {},
  );

  const activeTickets = tickets.filter(
    (ticket) => (STATUS_MAP[ticket.status] ?? "open") !== "open",
  );

  return definitions.map<TableBlock>((definition) => {
    const ticket = activeTickets.find((entry) =>
      entry.tableSlugs?.includes(definition.id),
    );
    const lines = ticket ? linesByTicket[ticket.id] ?? [] : [];
    const summary = summarizeLines(lines);

    return {
      ...definition,
      status: ticket ? STATUS_MAP[ticket.status] ?? "ordering" : "open",
      currentCourse: ticket?.currentCourse,
      lastOrderMinutes: ticket ? minutesSince(ticket.lastFireAt ?? ticket.updatedAt) : undefined,
      seatedMinutes: ticket ? minutesSince(ticket.seatedAt) : undefined,
      guestNames: ticket?.guestNames ?? [],
      billTotal: summary.subtotal - summary.compTotal,
    };
  });
}

