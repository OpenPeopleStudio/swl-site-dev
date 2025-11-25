import InventoryClient from "./InventoryClient";

import { fetchInventorySnapshot } from "@/lib/staff/inventory";

export const revalidate = 0;

export default async function InventoryPage() {
  const snapshot = await fetchInventorySnapshot({ includeAlcohol: false });
  return <InventoryClient initialSnapshot={snapshot} />;
}

