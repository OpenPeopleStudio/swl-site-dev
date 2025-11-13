# Owner Console — Advanced Modules

Four owner-only surfaces extend the existing console. Components live in `src/components/owner/` and can be composed via `OwnerConsoleAdvancedModules`.

## 1. Staff Motivation & Recognition Layer

- Component: `StaffMotivationLayer`
- Inputs:
  - `energyIndex` (0-100) from SchedulingOS + Prep Engine utilization.
  - `recognitionQueue` (staff + impact) pulled from Prep Engine task completions and Guest Memory compliments.
  - `rituals` synced with SchedulingOS recurring structures (family meal, lineup notes, post-service retro).
  - Optional `sentimentSnippet` from Guest Memory aggregated comments.
- Behavior: displays high-level pulse, recognition queue, and ritual status without exposing tactical noise. Depth via expand/click to show logs can be added later.

## 2. Guest Relationship Intelligence

- Component: `GuestRelationshipIntel`
- Inputs:
  - `guestThreads` built from Guest Memory + Menu Builder pairing data (VIP, watchlist, emerging relationships).
  - `referrals` from Guest Relationship Manager (CRM) + Concierge notes.
- Behavior: calm cards summarizing next action, last touch, and emotional context. Owners see only highly relevant threads.

## 3. Owner Time Horizon View

- Component: `OwnerTimeHorizonView`
- Inputs: `slices` describing 24h, 7d, 30d, 90d horizons with focus areas, dependencies, risks, and CTAs. Data references:
  - InventoryOS forecasts (ingredient risk)
  - Menu Builder roadmap (upcoming menus)
  - Vendor Intelligence (contract checkpoints)
  - Staffing board (headcount deltas)
- Behavior: timeline slices show what needs owner attention in each window.

## 4. Owner Reflection Panel

- Component: `OwnerReflectionPanel`
- Inputs:
  - `prompts` from Owner cadence (weekly alignment, cultural review, capital allocation).
  - `gratitudeStream` from Staff Motivation Layer/Guest Memory highlights.
  - `nextCheckIn` timestamp (calendar anchor).
- Behavior: provides journaling prompts + appreciation feed to keep cultural alignment high.

## Composition

Use `OwnerConsoleAdvancedModules` to slot data into the four modules:

```tsx
<OwnerConsoleAdvancedModules
  staffMotivation={...}
  guestIntelligence={...}
  timeHorizon={...}
  reflection={...}
/>
```

All components are display-only; hook them to Supabase queries or API routes via server components to keep owner data private.

## Advanced Route

`src/app/owner-console/advanced/page.tsx` demonstrates how to:
- reuse the owner gatekeeping logic
- hydrate module props with live Supabase data (staff table, private events, vendor profiles, opening reservations)
- render the advanced stack on a dedicated `/owner-console/advanced` route without touching the legacy console

Use this page as the canonical reference when wiring real forecasting sources or extending the owner-only layers.
