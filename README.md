# Snow White Laundry — Unified Documentation Library

> This README now aggregates every prior doc without trimming context or removing overlap.

### Included Documents
- README.md
- DESIGN_SYSTEM.md
- FIX_LOGIN.md
- USER_MANAGEMENT.md
- docs/cortexos/deploy.md
- docs/inventoryos/api.md
- docs/owner-console/advanced-modules.md
- docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md

---

## Document 1 · README.md

# Snow White Laundry — Staff Cortex

Internal-only Next.js 15 dashboard that powers staff access to scheduling, menu building, inventory tracking, and Cortex reflections for [Snow White Laundry](https://ai.snowwhitelaundry.co). The app ships with the dark neon-blue visual language that mirrors the guest site and is designed to deploy to its own Vercel project `swl-site-staff`.

## Stack

- Next.js 15 (App Router, React Compiler enabled)
- TypeScript + Tailwind CSS v4
- Framer Motion for UI motion states
- Supabase (Postgres 15+) with Service Role access

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in Supabase keys + site mode flag
npm run dev
```

Navigate to `http://localhost:3000/gate` to log in with a staff email/password stored in the `staff_access` table. Successful auth sets the `swl_staff` cookie and unlocks `/` and `/staff/*` routes via the Next.js proxy guard (`src/proxy.ts`).

## Environment variables

| Name | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role API key used by the gate API route |
| `NEXT_PUBLIC_SITE_MODE` | Static flag used for telemetry/analytics (defaults to `staff`) |
| `NEXT_PUBLIC_ENABLE_MSW` | Optional flag to force MSW handlers on (defaults to auto-on in development/test) |
| `NEXT_PUBLIC_DISABLE_MSW` | Optional flag to force MSW handlers off even in development |

## Supabase schema

```sql
create extension if not exists pgcrypto;
create table if not exists staff_access (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  must_reset boolean default false,
  role text default 'staff',
  created_at timestamptz default now()
);

insert into staff_access (email, password_hash, role)
values
  ('tom@openpeople.ai', crypt('opendeck', gen_salt('bf'))),
  ('ken@snowwhitelaundry.co', crypt('chefpass', gen_salt('bf')))
on conflict (email) do nothing;

create table if not exists staff_reflections (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  title text,
  summary text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

insert into staff_reflections (id, owner, title, summary, tags)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Tom',
    'Route 4B micro-delay',
    'Reload stop added 8 minutes; automation text fired correctly. Need faster manifest share.',
    array['logistics','automation']
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Ranya',
    'Foam injector recalibration',
    'Pressure sensor drifted 2%. Reset with manual override. Capture trending metrics nightly.',
    array['maintenance']
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Ken',
    'Menu allergen visibility',
    'Guests need immediate allergen callouts. Request surfaced to Menu Builder backlog.',
    array['menu','guest']
  );
```

Apply the schema locally or to your linked project via `supabase db push` (or `supabase db remote commit && supabase db remote push` in CI). That guarantees `/staff/reflection` builds without 404s because the service role can read from `public.staff_reflections` during static generation and the PWA precache step.

## Key directories

```
src/app/
├── page.tsx            # Staff dashboard launcher
├── gate/page.tsx       # Auth gate
├── api/owner/gate/route.ts   # Supabase-backed login endpoint
└── staff/              # Module surfaces (schedule, menu, inventory, reflection)
src/proxy.ts            # Cookie guard for / and /staff/*
src/components/staff/   # Shared Cortex UI components
```

## Deployment

1. Initialize a new git repository and push to `openpeople/swl-site-staff`.
2. `vercel link` → select `swl-site-staff`.
3. Configure the three environment variables above in Vercel (production + preview).
4. `vercel --prod` to ship the dashboard.

The production domain should remain `ai.snowwhitelaundry.co`. Ensure the Supabase service role key is treated as sensitive and never exposed to the browser—only the `/api/owner/gate` route uses it server-side.

## Progressive Web App install

The staff dashboard now ships with a web app manifest (`src/app/manifest.ts`) and a lightweight service worker (`public/sw.js`) so it can be installed to iOS/Android home screens.

1. For local testing set `NEXT_PUBLIC_ENABLE_SW=true` in `.env.local`, then run `npm run build && npm run start` so the service worker is registered against a production-like build. (It stays disabled during `npm run dev` to avoid aggressive caching.)
2. Visit the site in Safari (iOS) or Chrome (Android/Desktop) and choose “Add to Home Screen” once the install prompt appears.
3. When deploying to Vercel no extra configuration is required—service workers automatically register in production because `process.env.NODE_ENV === "production"`.

The service worker precaches the app shell (`/`, `/gate`, static icons, and Next build assets) and falls back to network for Supabase/API requests to keep fresh data.
# swl-site-dev

---

## Document 2 · DESIGN_SYSTEM.md

# Snow White Laundry — Design System

## Philosophy

- **Aesthetic**: Monochrome, poetic, calm, reflective, intimate, elegant
- **Material**: OLED-black mirror surfaces, soft reflection, thin glow, low-opacity glass edges
- **Atmosphere**: Sparse starfield, slow drift, zero color accents (luminance-only)
- **Typography**: Söhne / Inter (headings Title Case, body sentence case)
- **Motion**: Physics-driven micro-drift, ease-out ceremonial transitions, slow luminance fades
- **Identity**: intention · emotion · craft (implicit everywhere)
- **Tone**: No marketing voice. Calm precision. Minimalism with emotional weight.

## Components

### Core Components
- `SiteShell` - Main container with starfield background
- `StarField` - Sparse animated starfield layers
- `GlassPanel` - Base glass surface with drift physics
- `RitualTransition` - Ceremonial entrance animations
- `PageHeader` - Standardized page headers
- `PageFooter` - Standardized page footers
- `GlassDivider` - Subtle divider lines
- `GlassSection` - Content sections with glass styling

### UI Components
- `GlassButton` - Buttons with glass styling
- `GlassInput` - Text inputs with glass styling
- `GlassTextarea` - Textarea with glass styling
- `GlassForm` - Form container
- `GlassNav` - Navigation component
- `GlassCard` - Card component

## Design Tokens

Located in `/src/design/`:
- `tokens.css` - CSS custom properties
- `motion.ts` - Motion curves and timing
- `reflections.ts` - Reflection physics
- `atmosphere.ts` - Starfield configuration

## Pages

### Public Pages
- `/` - Landing page
- `/prelude` - Philosophy introduction
- `/reserve` - Reservation request (placeholder)
- `/contact` - Contact form

### Staff Pages
- `/staff` - Owner dashboard (placeholders)
- `/staff/breadcrumbs` - Breadcrumb creator (redesigned)

## JSON-LD Schemas

- Restaurant schema (landing page)
- ContactPage schema (contact page)
- ComingSoon schema (available)

## Usage

```tsx
import { SiteShell, PageHeader, GlassButton } from "@/components/design";

export default function MyPage() {
  return (
    <SiteShell>
      <PageHeader title="My Page" />
      <GlassButton href="/other">Navigate</GlassButton>
    </SiteShell>
  );
}
```

---

## Document 3 · FIX_LOGIN.md

# Fix Login Issue - User Exists But No Password

## Problem
User exists in Supabase Auth (`auth.users`) but login fails because password isn't set.

## Solution 1: Use Set Password API (Quickest)

Make a POST request to set the password:

```bash
curl -X POST http://localhost:3000/api/admin/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "yournewpassword"
  }'
```

Or use your browser's console:
```javascript
fetch('/api/admin/set-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'yournewpassword'
  })
}).then(r => r.json()).then(console.log)
```

## Solution 2: Add to Seed Users (Permanent)

Edit `/src/app/api/owner/gate/route.ts` and `/src/app/api/auth/check-user/route.ts`:

Add your user to the `SEEDED_USERS` array:

```typescript
const SEEDED_USERS = [
  // ... existing users ...
  {
    email: "your-email@example.com",
    passwordEnv: "GATE_YOURUSER_PASSWORD",  // Optional
    fallbackPassword: "yourpassword",       // Used if env var not set
    metadata: { role: "staff" },             // or "owner" | "customer"
  },
] as const;
```

Then optionally add to `.env.local`:
```
GATE_YOURUSER_PASSWORD=yourpassword
```

The seed user sync will automatically set the password on next login attempt.

## Solution 3: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Find your user
3. Click on the user
4. Click **Reset Password** or **Update Password**
5. Set a new password

## Solution 4: Force Password Sync (If user is in SEEDED_USERS)

If your user is already in `SEEDED_USERS` but password isn't syncing:

1. Check your `.env.local` file has the correct password env var
2. Try logging in again - the sync happens on every auth attempt
3. Check server logs for sync errors

## Debugging

Check the `gate_auth_log` table to see what error occurred:

```sql
SELECT * FROM gate_auth_log 
WHERE email = 'your-email@example.com' 
ORDER BY created_at DESC 
LIMIT 10;
```

This will show you the exact error message from the login attempt.

## Common Issues

1. **Password not set**: User was created manually without password → Use Solution 1 or 3
2. **Password env var missing**: User in SEEDED_USERS but env var not set → Add to `.env.local`
3. **User not in SEEDED_USERS**: User exists but not synced → Use Solution 2
4. **Password too short**: Supabase requires min 6 chars → Use longer password

---

## Document 4 · USER_MANAGEMENT.md

# User Management Guide

## How to Add/Change Users with Gate Access

### Method 1: Add Seed Users (Code-Based)

Edit the `SEEDED_USERS` array in **two files**:

1. `/src/app/api/owner/gate/route.ts` (lines 52-71)
2. `/src/app/api/auth/check-user/route.ts` (lines 4-23)

Add a new user entry:

```typescript
{
  email: "newuser@example.com",
  passwordEnv: "GATE_NEWUSER_PASSWORD",  // Optional: env var name
  fallbackPassword: "defaultpassword",    // Used if env var not set
  metadata: { role: "staff" },            // "owner" | "staff" | "customer"
}
```

Then add the environment variable to `.env.local` (optional):
```
GATE_NEWUSER_PASSWORD=securepassword123
```

**Note:** Seed users are automatically synced every time someone tries to authenticate at `/gate`.

### Method 2: Via Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create New User**
4. Enter:
   - Email address
   - Password
   - User Metadata (JSON):
     ```json
     {
       "role": "staff",
       "full_name": "User Name"
     }
     ```
5. Set **Email Confirmed** to `true`

### Method 3: Via Registration Endpoint (Self-Service)

Users can register themselves at `/gate` with `intent: "register"`. They'll automatically get `role: "customer"`.

### Method 4: Via Supabase SQL (Direct Database)

```sql
-- Create user directly in auth.users
-- Note: This requires Supabase Admin API or direct database access

-- You can't directly insert into auth.users via SQL
-- Use Supabase Admin API instead (see Method 2 or code)
```

### Changing User Roles

**Via Code:**
- Update the `metadata.role` in `SEEDED_USERS` array
- The role will sync on next authentication

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Click on the user
3. Edit **User Metadata**:
   ```json
   {
     "role": "owner"  // Change to: "owner" | "staff" | "customer"
   }
   ```

**Via SQL (if you have direct access):**
```sql
-- Update user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"owner"'
)
WHERE email = 'user@example.com';
```

### Changing Passwords

**Via Code:**
- Update `passwordEnv` or `fallbackPassword` in `SEEDED_USERS`
- Password syncs on next authentication

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Click on the user
3. Click **Reset Password** or **Update Password**

**Via Environment Variable:**
- Set the password in `.env.local`:
  ```
  GATE_USERNAME_PASSWORD=newpassword
  ```
- The seed user sync will pick it up automatically

### Removing Users

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Find the user
3. Click **Delete User**

**Via Code:**
- Remove the user from `SEEDED_USERS` array
- User will still exist in Supabase but won't auto-sync passwords

### Current Seed Users

Based on the code, these users are configured:

1. `tom@openpeople.ai` - Role: `owner`
2. `tom@snowwhitelaundry.com` - Role: `staff`
3. `toml_ne@icloud.com` - Role: `customer`

### Important Notes

- **Seed users sync automatically** - Every time someone authenticates, seed users are synced
- **Roles matter** - The role determines what parts of the app users can access
- **Passwords** - Use environment variables for production, fallback passwords for development
- **Email confirmation** - Seed users are auto-confirmed (`email_confirm: true`)

---

## Document 5 · docs/cortexos/deploy.md

# CortexOS Deploy Notes

## Vercel Settings
- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: `.next`

## Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Package Scripts
Ensure `package.json` includes:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```
Vercel automatically executes `npm run build` followed by `npm start`.

## Local-Only Processes
- `codex/orchestrator/dispatch.js`
- `codex/orchestrator/oversee.js`
- `codex/orchestrator/watch.js`

Do **not** run these scripts in Vercel. They are intended for local routing and merge simulation only.

## Verification Checklist
1. `npm run lint`
2. `npm run build`
3. Confirm `/app/console` loads boot sequence, orbit map, dashboard, and terminal.

---

## Document 6 · docs/inventoryos/api.md

# InventoryOS API Endpoints

The following endpoints sit under `/api/staff/inventory/*` and call Supabase RPC functions to interact with the InventoryOS tables. All requests are `POST` and expect JSON payloads.

## Food Receiving
- **Endpoint:** `/api/staff/inventory/food/receive`
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
- **Endpoint:** `/api/staff/inventory/food/waste`
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
- **Endpoint:** `/api/staff/inventory/alcohol/receive`
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
- **Endpoint:** `/api/staff/inventory/alcohol/variance`
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
- **Endpoint:** `/api/staff/inventory/health-report`
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
     - `FoodCountPane` to submit counts via `/api/staff/inventory/food/receive`.
     - `FoodReceivingPane` & `FoodWasteModal` calling the receive/waste endpoints.
     - `FoodVendorPanel`, `FoodAutoReplenishPanel`, `FoodForecastPanel`, and `FoodStorageMapViewer` for contextual insights.

3. **Alcohol Module**
   - `AlcoholInventoryDashboard` composes:
     - `AlcoholBottleCard` list from `listAlcoholInventory`.
     - `AlcoholCountPane`, `AlcoholReceivingPane`, `AlcoholVariancePanel`, and `AlcoholPourCostBreakdown` that post to alcohol receive/variance endpoints.
     - `AlcoholAutoReplenishPanel`, `AlcoholKegTracker`, `AlcoholStorageMapViewer` for extended features.

4. **Shared Panels**
   - `VendorInsightPanel` consumes `listVendorProfiles`.
   - `AIInsightPanel` should display recommendations derived from `/api/staff/inventory/health-report`.
   - `InventoryNotesPanel` should hydrate from `listInventoryNotes` and eventually post to an `/api/staff/inventory/notes` endpoint.

5. **Follow-up Roadmap**
   - Build the TSX components listed in the InventoryOS spec (Food/Alcohol sections) using the shared shell.
   - Add hooks for forecasting/AI panels once health reports and cost alerts are populated via scheduled jobs.

---

## Document 7 · docs/owner-console/advanced-modules.md

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

---

## Document 8 · docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md

// /scripts/save-portal-concept.ts
// Open People Archive Protocol — EXECUTED
// Neural Glass: black canvas, sacred commit, structural empathy.
// Status: COMMITTED — 2025-11-12 23:47 UTC

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const ARCHIVE_PATH = join(REPO_ROOT, 'docs', 'portal');
const FILE_PATH = join(ARCHIVE_PATH, 'CORTEXOS_GUEST_PORTAL_v1.0.md');

const CONTENT = `# CortexOS Guest Portal v1.0 — The Sacred Mirror

> *The guest does not leave when they pay. They live in the mirror.*

A living relationship between guest, sanctuary, and soul.  
No login. No friction. Only memory.

---

## The 5 Mirrors

| Mirror | Essence | Feeds |
|-------|--------|-------|
| 1. **Countdown** | Anticipation as ritual | ECI pre-event |
| 2. **Vision Board** | Co-creation of the night | Kitchen, FOH, lighting |
| 3. **Memory Vault** | Photos, dates, soul notes | Culture wall |
| 4. **Live Whispers** | Real-time table link | Service flow |
| 5. **Future Seeds** | Loyalty as planting | Forecasting |

---

## Tech Soul

- Next.js 16 (App Router)
- Supabase (Auth + Realtime + Storage)
- Tailwind + Neural Glass CSS
- Magic Link Auth
- PWA installable
- AI memory sync

---

## Live Paths

\`\`\`
snowwhitelaundry.co/portal     → Guest Mirror
ai.snowwhitelaundry.co/portal  → Staff Soul View
\`\`\`

---

## Visual Soul (ASCII)

\`\`\`
╔════════════════════════════════════════════════════════════════════╗
║                       SNOW WHITE LAUNDRY                           ║
║                    Welcome back, Elena.                            ║
╟────────────────────────────────────────────────────────────────────╢
║                         38d 14h 22m                                ║
║             ● Winter Solstice Buyout • 80 souls                   ║
╟────────────────────────────────────────────────────────────────────╢
║                        SHAPE YOUR NIGHT                            ║
║  [ Mood: Intimate ]        [ Music: ambient jazz ]                 ║
╟────────────────────────────────────────────────────────────────────╢
║                      YOUR NIGHTS WITH US                           ║
║  ┌────────────────────┐   ┌────────────────────┐                 ║
║  │     November 15    │   │    October 28      │                 ║
║  └────────────────────┘   └────────────────────┘                 ║
╟────────────────────────────────────────────────────────────────────╢
║                    ● Whisper to Your Table                         ║
╟────────────────────────────────────────────────────────────────────╢
║                      PLANT THE NEXT NIGHT                          ║
║             [ Reserve Again ]     [ Gift a Night ]                 ║
╚════════════════════════════════════════════════════════════════════╝
\`\`\`

---

**Saved in:** \`docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md\`  
**Status:** ARCHIVED. ALIVE. WAITING.

*Structure before power. Humanity before machine. Alignment before memory.*
`;

// === EXECUTE SAVE ===
try {
  // Ensure directory exists
  execSync(`mkdir -p ${ARCHIVE_PATH}`);
  
  // Write file
  writeFileSync(FILE_PATH, CONTENT.trim());
  console.log(`✓ File saved: ${FILE_PATH}`);

  // Git add & commit
  execSync(`git add ${FILE_PATH}`);
  execSync(`
    git commit -m "archive(portal): v1.0 — guest mirror with 5 sacred reflections

chore: memory now outlives the night
refactor: the guest is co-author, not consumer

Structure before power. Humanity before machine. Alignment before memory."
  `);
  console.log(`✓ Committed to repo`);

  // Push to origin/main
  execSync(`git push origin main`);
  console.log(`✓ Pushed to remote`);

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                     CONCEPT SAVED TO REPO                          ║
║                                                                    ║
║  Path: docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md                   ║
║  Commit: $(git rev-parse --short HEAD)                             ║
║  Remote: https://github.com/openpeople/snowwhitelaundry.co         ║
║                                                                    ║
║  The mirror is sealed. The soul is preserved.                      ║
╚════════════════════════════════════════════════════════════════════╝
  `);
} catch (error) {
  console.error("Failed to save to repo:", error);
}

---
