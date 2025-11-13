# InventoryOS API Endpoints

The following endpoints sit under `/api/inventory/*` and call Supabase RPC functions to interact with the InventoryOS tables. All requests are `POST` and expect JSON payloads.

## Food Receiving
- **Endpoint:** `/api/inventory/food/receive`
- **Payload:**
```json
{
  "itemId": "uuid",
  "quantity": 12.5,
  "unitType": "kg",
  "costPerUnit": 18.25,
  "vendorId": "uuid",
  "invoiceRef": "INV-2044",
  "receivedBy": "staff-uuid",
  "notes": "Night delivery",
  "metadata": { "po": "PO-88" }
}
```
- **Response:** `{ "item_id": "...", "new_on_hand": 42.5, "last_invoice_cost": 18.25 }`

## Food Waste
- **Endpoint:** `/api/inventory/food/waste`
- **Payload:**
```json
{
  "itemId": "uuid",
  "quantity": 1.2,
  "unitType": "kg",
  "reason": "spoilage",
  "staffId": "staff-uuid",
  "notes": "Line cooler failure"
}
```
- **Response:** `{ "item_id": "...", "new_on_hand": 38.3 }`

## Alcohol Receiving
- **Endpoint:** `/api/inventory/alcohol/receive`
- **Payload:**
```json
{
  "itemId": "uuid",
  "bottleCount": 6,
  "openVolume": 0,
  "costPerBottle": 32,
  "vendorId": "uuid",
  "invoiceRef": "INV-900",
  "receivedBy": "staff-uuid",
  "notes": "Vintage verified"
}
```
- **Response:** `{ "item_id": "...", "new_bottle_count": 24, "new_open_volume": 1.5 }`

## Alcohol Variance
- **Endpoint:** `/api/inventory/alcohol/variance`
- **Payload:**
```json
{
  "itemId": "uuid",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-07",
  "expectedVolume": 24,
  "actualVolume": 22.5,
  "notes": "Spills during NYE service"
}
```
- **Response:** `{ "item_id": "...", "variance_percent": -6.25, "variance_value": -1.5 }`

## Inventory Health Report
- **Endpoint:** `/api/inventory/health-report`
- **Payload:** `{ "reportDate": "2025-01-13" }` (optional, defaults to current date)
- **Response:** `{ "reportId": "uuid" }`

## Usage Notes
- All endpoints require server-side authentication (they use the Supabase Service Role via `getSupabaseAdmin`).
- The RPC functions (`record_food_receiving`, `record_food_waste`, `record_alcohol_receiving`, `record_alcohol_variance`, `generate_inventory_health_report`) live in `supabase/migrations/202511130004_inventoryos_functions.sql`.
- UI components should call these endpoints via fetch or server actions and optimistically update dashboards with returned quantities/variance data.
- For server components, use helper queries under `src/lib/inventory.ts` (`listFoodInventory`, `listAlcoholInventory`, `listVendorProfiles`, `listInventoryNotes`) to render dashboards without exposing secrets to the browser.

## UI Composition Guidance

1. **Shared Shell**
   - Place `InventoryTopBar`, `InventorySearchBar`, and `InventorySidebar` at the top-level of Food/Alcohol dashboards for consistent navigation.
   - Use the sidebar sections to toggle between Food Inventory, Alcohol Inventory, Vendors, Notes, and Forecasts.

2. **Food Module**
   - `FoodInventoryDashboard` (upcoming) should stitch together:
     - `FoodItemCard` grid fed by `listFoodInventory`.
     - `FoodCountPane` to submit counts via `/api/inventory/food/receive`.
     - `FoodReceivingPane` & `FoodWasteModal` calling the receive/waste endpoints.
     - `FoodVendorPanel`, `FoodAutoReplenishPanel`, `FoodForecastPanel`, and `FoodStorageMapViewer` for contextual insights.

3. **Alcohol Module**
   - `AlcoholInventoryDashboard` composes:
     - `AlcoholBottleCard` list from `listAlcoholInventory`.
     - `AlcoholCountPane`, `AlcoholReceivingPane`, `AlcoholVariancePanel`, and `AlcoholPourCostBreakdown` that post to alcohol receive/variance endpoints.
     - `AlcoholAutoReplenishPanel`, `AlcoholKegTracker`, `AlcoholStorageMapViewer` for extended features.

4. **Shared Panels**
   - `VendorInsightPanel` consumes `listVendorProfiles`.
   - `AIInsightPanel` should display recommendations derived from `/api/inventory/health-report`.
   - `InventoryNotesPanel` should hydrate from `listInventoryNotes` and eventually post to an `/api/inventory/notes` endpoint.

5. **Follow-up Roadmap**
   - Build the TSX components listed in the InventoryOS spec (Food/Alcohol sections) using the shared shell.
   - Add hooks for forecasting/AI panels once health reports and cost alerts are populated via scheduled jobs.
