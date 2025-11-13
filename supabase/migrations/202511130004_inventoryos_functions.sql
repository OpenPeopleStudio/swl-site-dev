-- InventoryOS helper functions and RPC-friendly procedures

create or replace function public.record_food_receiving(
  p_item_id uuid,
  p_quantity numeric,
  p_unit_type text,
  p_cost_per_unit numeric,
  p_vendor_id uuid,
  p_invoice_ref text default null,
  p_received_by uuid default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
) returns table (
  item_id uuid,
  new_on_hand numeric,
  last_invoice_cost numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_record food_inventory_items%rowtype;
  delivery_id uuid;
begin
  update food_inventory_items
  set
    on_hand_quantity = coalesce(on_hand_quantity, 0) + coalesce(p_quantity, 0),
    last_invoice_cost = coalesce(p_cost_per_unit, last_invoice_cost),
    cost_per_unit = case
      when p_cost_per_unit is not null then p_cost_per_unit
      else cost_per_unit
    end,
    vendor_id = coalesce(p_vendor_id, vendor_id),
    updated_at = now()
  where id = p_item_id
  returning * into updated_record;

  insert into food_price_history (
    item_id,
    vendor_id,
    invoice_ref,
    cost_per_unit,
    metadata
  ) values (
    p_item_id,
    coalesce(p_vendor_id, updated_record.vendor_id),
    p_invoice_ref,
    coalesce(p_cost_per_unit, updated_record.cost_per_unit),
    p_metadata
  );

  insert into delivery_logs (
    vendor_id,
    module,
    reference_type,
    reference_id,
    delivered_at,
    received_by,
    status,
    issues,
    notes
  )
  values (
    coalesce(p_vendor_id, updated_record.vendor_id),
    'food',
    'food_inventory_items',
    p_item_id::text,
    now(),
    p_received_by,
    'received',
    '[]'::jsonb,
    p_notes
  )
  returning id into delivery_id;

  return query
  select updated_record.id, updated_record.on_hand_quantity, updated_record.last_invoice_cost;
end;
$$;

create or replace function public.record_food_waste(
  p_item_id uuid,
  p_quantity_lost numeric,
  p_unit_type text,
  p_reason text,
  p_staff_id uuid,
  p_notes text default null
) returns table (
  item_id uuid,
  new_on_hand numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_record food_inventory_items%rowtype;
begin
  update food_inventory_items
  set
    on_hand_quantity = greatest(coalesce(on_hand_quantity, 0) - coalesce(p_quantity_lost, 0), 0),
    updated_at = now()
  where id = p_item_id
  returning * into updated_record;

  insert into food_waste (
    item_id,
    quantity_lost,
    unit_type,
    reason,
    staff_id,
    cost_impact,
    recorded_at
  ) values (
    p_item_id,
    p_quantity_lost,
    p_unit_type,
    p_reason,
    p_staff_id,
    coalesce(updated_record.cost_per_unit, 0) * coalesce(p_quantity_lost, 0),
    now()
  );

  return query
  select updated_record.id, updated_record.on_hand_quantity;
end;
$$;

create or replace function public.record_food_count(
  p_item_id uuid,
  p_counted_quantity numeric,
  p_staff_id uuid default null,
  p_notes text default null
) returns table (
  item_id uuid,
  new_on_hand numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_record food_inventory_items%rowtype;
begin
  update food_inventory_items
  set
    on_hand_quantity = coalesce(p_counted_quantity, on_hand_quantity),
    last_counted_at = now(),
    updated_at = now()
  where id = p_item_id
  returning * into updated_record;

  insert into food_counts (
    item_id,
    counted_quantity,
    variance,
    counted_by,
    counted_at,
    notes
  ) values (
    p_item_id,
    p_counted_quantity,
    coalesce(p_counted_quantity, 0) - coalesce(updated_record.on_hand_quantity, 0),
    p_staff_id,
    now(),
    p_notes
  );

  return query
  select updated_record.id, updated_record.on_hand_quantity;
end;
$$;

create or replace function public.record_alcohol_receiving(
  p_item_id uuid,
  p_bottle_count numeric,
  p_open_volume numeric,
  p_cost_per_bottle numeric,
  p_vendor_id uuid,
  p_invoice_ref text default null,
  p_received_by uuid default null,
  p_notes text default null
) returns table (
  item_id uuid,
  new_bottle_count numeric,
  new_open_volume numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_record alcohol_inventory_items%rowtype;
begin
  update alcohol_inventory_items
  set
    bottle_count = coalesce(bottle_count, 0) + coalesce(p_bottle_count, 0),
    open_bottle_volume = coalesce(open_bottle_volume, 0) + coalesce(p_open_volume, 0),
    cost_per_bottle = coalesce(p_cost_per_bottle, cost_per_bottle),
    vendor_id = coalesce(p_vendor_id, vendor_id),
    updated_at = now()
  where id = p_item_id
  returning * into updated_record;

  insert into alcohol_price_history (
    item_id,
    vendor_id,
    invoice_ref,
    cost_per_bottle,
    cost_per_ounce
  ) values (
    p_item_id,
    coalesce(p_vendor_id, updated_record.vendor_id),
    p_invoice_ref,
    coalesce(p_cost_per_bottle, updated_record.cost_per_bottle),
    null
  );

  insert into delivery_logs (
    vendor_id,
    module,
    reference_type,
    reference_id,
    delivered_at,
    received_by,
    status,
    issues,
    notes
  ) values (
    coalesce(p_vendor_id, updated_record.vendor_id),
    'alcohol',
    'alcohol_inventory_items',
    p_item_id::text,
    now(),
    p_received_by,
    'received',
    '[]'::jsonb,
    p_notes
  );

  return query
  select updated_record.id, updated_record.bottle_count, updated_record.open_bottle_volume;
end;
$$;

create or replace function public.record_alcohol_variance(
  p_item_id uuid,
  p_period_start date,
  p_period_end date,
  p_expected_volume numeric,
  p_actual_volume numeric,
  p_notes text default null
) returns table (
  item_id uuid,
  variance_percent numeric,
  variance_value numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  variance_percent numeric;
  variance_value numeric;
begin
  variance_value := coalesce(p_actual_volume, 0) - coalesce(p_expected_volume, 0);
  if coalesce(p_expected_volume, 0) = 0 then
    variance_percent := null;
  else
    variance_percent := (variance_value / p_expected_volume) * 100;
  end if;

  insert into alcohol_variance (
    item_id,
    period_start,
    period_end,
    expected_volume,
    actual_volume,
    variance_percent,
    variance_value,
    bartending_accuracy,
    notes
  ) values (
    p_item_id,
    coalesce(p_period_start, current_date),
    coalesce(p_period_end, current_date),
    p_expected_volume,
    p_actual_volume,
    variance_percent,
    variance_value,
    case
      when variance_percent is null then null
      else greatest(0, 100 - abs(variance_percent))
    end,
    p_notes
  );

  return query
  select p_item_id, variance_percent, variance_value;
end;
$$;

create or replace function public.generate_inventory_health_report(
  p_report_date date default current_date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  report_id uuid;
begin
  insert into inventory_health (
    report_date,
    shortages,
    projected_shortages,
    waste_summary,
    vendor_issues,
    cost_drift,
    alcohol_variance,
    prep_feasibility,
    ai_recommendations
  )
  values (
    p_report_date,
    (
      select jsonb_agg(row_to_json(q))
      from (
        select id, name, on_hand_quantity, minimum_threshold
        from food_inventory_items
        where minimum_threshold is not null
          and on_hand_quantity < minimum_threshold
      ) q
    ),
    '[]'::jsonb,
    jsonb_build_object(
      'food_waste', coalesce((select sum(cost_impact) from food_waste where recorded_at::date = p_report_date), 0),
      'alcohol_waste', coalesce((select sum(cost_impact) from alcohol_waste where recorded_at::date = p_report_date), 0)
    ),
    '[]'::jsonb,
    jsonb_build_object(
      'food', (
        select jsonb_agg(row_to_json(sub))
        from (
          select id, name, cost_drift_percent
          from food_inventory_items
          where cost_drift_percent is not null and abs(cost_drift_percent) > 5
        ) sub
      )
    ),
    (
      select jsonb_agg(row_to_json(sub))
      from (
        select item_id, variance_percent, variance_value
        from alcohol_variance
        where period_end >= (p_report_date - interval '7 days')
      ) sub
    ),
    '{}'::jsonb,
    '[]'::jsonb
  )
  returning id into report_id;

  return report_id;
end;
$$;
