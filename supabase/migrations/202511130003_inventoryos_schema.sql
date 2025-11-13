-- InventoryOS schema: food, alcohol, and shared inventory intelligence tables
-- Deterministic, additive migration

create extension if not exists pgcrypto;

-- Shared vendors ------------------------------------------------------------

create table if not exists public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  punctuality_rating numeric(4,2),
  cost_drift_percent numeric(6,3),
  communication_score numeric(4,2),
  substitution_frequency numeric(6,3),
  weekend_reliability numeric(4,2),
  seasonal_performance jsonb default '{}'::jsonb,
  tags text[] default '{}',
  active boolean default true,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vendor_profiles_active_idx
  on vendor_profiles (active);

-- Food inventory tables -----------------------------------------------------

create table if not exists public.food_inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  subcategory text,
  unit_type text not null,
  on_hand_quantity numeric(14,4) default 0,
  par_level numeric(14,4),
  minimum_threshold numeric(14,4),
  storage_zone text,
  vendor_id uuid references vendor_profiles(id),
  shelf_life_days integer,
  expiry_date date,
  yield_percent numeric(6,3),
  waste_percent numeric(6,3),
  cost_per_unit numeric(14,4),
  last_invoice_cost numeric(14,4),
  usage_frequency numeric(10,3),
  recipe_dependency jsonb default '[]'::jsonb,
  ai_price_baseline numeric(14,4),
  cost_drift_percent numeric(6,3),
  last_counted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists food_inventory_vendor_idx
  on food_inventory_items (vendor_id);

create table if not exists public.food_counts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  counted_quantity numeric(14,4) not null,
  variance numeric(14,4),
  counted_by uuid references public.staff(id),
  counted_at timestamptz default now(),
  notes text
);

create table if not exists public.food_waste (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  quantity_lost numeric(14,4) not null,
  unit_type text,
  reason text,
  staff_id uuid references public.staff(id),
  cost_impact numeric(14,4),
  adjustments jsonb default '{}'::jsonb,
  recorded_at timestamptz default now()
);

create index if not exists food_waste_item_idx
  on food_waste (item_id, recorded_at desc);

create table if not exists public.food_price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  vendor_id uuid references vendor_profiles(id),
  invoice_ref text,
  cost_per_unit numeric(14,4) not null,
  effective_date date default current_date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.food_vendor_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  vendor_id uuid references vendor_profiles(id),
  punctuality_score numeric(4,2),
  quality_score numeric(4,2),
  substitution_events integer default 0,
  last_ordered_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.food_storage_map (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  zone text not null,
  shelf text,
  bin_label text,
  coordinates jsonb default '{}'::jsonb,
  capacity numeric(14,4),
  created_at timestamptz default now()
);

create table if not exists public.food_par_levels (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  season text,
  par_level numeric(14,4) not null,
  minimum_threshold numeric(14,4),
  effective_start date default current_date,
  effective_end date,
  created_at timestamptz default now()
);

create table if not exists public.food_usage_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references food_inventory_items(id) on delete cascade,
  source_type text,
  source_id text,
  quantity_used numeric(14,4) not null,
  unit_type text,
  recorded_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Alcohol inventory tables --------------------------------------------------

create table if not exists public.alcohol_inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  subcategory text,
  unit_size text,
  bottle_count numeric(14,4) default 0,
  open_bottle_volume numeric(14,4),
  keg_volume_remaining numeric(14,4),
  par_level numeric(14,4),
  minimum_threshold numeric(14,4),
  storage_zone text,
  vendor_id uuid references vendor_profiles(id),
  cost_per_bottle numeric(14,4),
  cost_per_ounce numeric(14,4),
  variance_history jsonb default '[]'::jsonb,
  cocktail_dependency jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists alcohol_inventory_vendor_idx
  on alcohol_inventory_items (vendor_id);

create table if not exists public.alcohol_counts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  bottle_count numeric(14,4),
  open_volume numeric(14,4),
  counted_by uuid references public.staff(id),
  counted_at timestamptz default now(),
  notes text
);

create table if not exists public.alcohol_waste (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  quantity_lost numeric(14,4) not null,
  unit_type text,
  reason text,
  staff_id uuid references public.staff(id),
  cost_impact numeric(14,4),
  recorded_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.alcohol_variance (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  expected_volume numeric(14,4),
  actual_volume numeric(14,4),
  variance_percent numeric(6,3),
  variance_value numeric(14,4),
  bartending_accuracy numeric(6,3),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  vendor_id uuid references vendor_profiles(id),
  invoice_ref text,
  cost_per_bottle numeric(14,4) not null,
  cost_per_ounce numeric(14,4),
  effective_date date default current_date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_vendor_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  vendor_id uuid references vendor_profiles(id),
  accuracy_score numeric(4,2),
  breakage_events integer default 0,
  last_ordered_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_kegs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  keg_identifier text,
  total_volume numeric(14,4),
  remaining_volume numeric(14,4),
  weight_kg numeric(10,3),
  tapped_at timestamptz,
  status text,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_storage_map (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  zone text not null,
  rack text,
  slot text,
  coordinates jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_pour_templates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  cocktail_name text not null,
  pour_volume numeric(14,4) not null,
  cost_per_cocktail numeric(14,4),
  pairing_notes text,
  created_at timestamptz default now()
);

create table if not exists public.alcohol_usage_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references alcohol_inventory_items(id) on delete cascade,
  source_type text,
  source_id text,
  quantity_used numeric(14,4) not null,
  unit_type text,
  recorded_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Shared operational tables -------------------------------------------------

create table if not exists public.delivery_logs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendor_profiles(id),
  module text, -- food or alcohol
  reference_type text,
  reference_id text,
  delivered_at timestamptz default now(),
  received_by uuid references public.staff(id),
  status text,
  issues jsonb default '[]'::jsonb,
  photos jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.inventory_health (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  shortages jsonb default '[]'::jsonb,
  projected_shortages jsonb default '[]'::jsonb,
  waste_summary jsonb default '{}'::jsonb,
  vendor_issues jsonb default '[]'::jsonb,
  cost_drift jsonb default '{}'::jsonb,
  alcohol_variance jsonb default '{}'::jsonb,
  prep_feasibility jsonb default '{}'::jsonb,
  ai_recommendations jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  unique (report_date)
);

create table if not exists public.inventory_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.staff(id),
  note text not null,
  related_module text,
  related_table text,
  related_id text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.inventory_media (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references inventory_notes(id) on delete cascade,
  media_url text not null,
  media_type text,
  attached_to_table text,
  attached_to_id text,
  metadata jsonb default '{}'::jsonb,
  uploaded_by uuid references public.staff(id),
  created_at timestamptz default now()
);

create table if not exists public.cost_alerts (
  id uuid primary key default gen_random_uuid(),
  item_type text not null, -- food or alcohol
  item_id uuid not null,
  alert_type text not null,
  severity text,
  message text,
  triggered_at timestamptz default now(),
  resolved boolean default false,
  resolved_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create index if not exists cost_alerts_item_idx
  on cost_alerts (item_type, item_id);

create table if not exists public.inventory_notes_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references inventory_notes(id) on delete cascade,
  link_type text,
  target_table text,
  target_id text,
  created_at timestamptz default now()
);
