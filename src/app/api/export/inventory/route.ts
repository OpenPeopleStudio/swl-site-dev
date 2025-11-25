import { NextResponse } from "next/server";

import type { InventoryExportRequest } from "@/types/inventory";

const CSV_HEADER = ["Name", "Category", "Location", "Unit", "On hand", "Par", "Minimum", "Vendor"];

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as InventoryExportRequest;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const session = payload.session ?? null;
    const generatedAt = payload.generatedAt ?? new Date().toISOString();
    const format = payload.format ?? "csv";

    if (items.length === 0) {
      return NextResponse.json({ error: "No inventory rows supplied" }, { status: 400 });
    }

    const headerLines = [
      "# Snow White Laundry · Inventory Export",
      `# Generated: ${generatedAt}`,
      session ? `# Session: ${session.label} (${session.id})` : "# Session: none",
      session?.focusZone ? `# Focus: ${session.focusZone}` : "# Focus: —",
      `# Rows: ${items.length}`,
      "#",
    ];

    const csvRows = items.map((item) =>
      [
        item.name,
        item.category ?? "",
        item.location ?? "",
        item.unit ?? "",
        item.projectedOnHand.toString(),
        item.parLevel ?? "",
        item.minimumThreshold ?? "",
        item.vendorName ?? "",
      ].map((value) => {
        const normalized = `${value ?? ""}`;
        const escaped = normalized.replace(/"/g, '""');
        return `"${escaped}"`;
      }),
    );

    const body = [
      ...headerLines,
      CSV_HEADER.map((value) => `"${value}"`).join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    if (format === "print") {
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const filename = `swl-inventory-${new Date().toISOString()}.csv`;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("inventory export error", error);
    return NextResponse.json({ error: "Unable to generate export" }, { status: 500 });
  }
}

