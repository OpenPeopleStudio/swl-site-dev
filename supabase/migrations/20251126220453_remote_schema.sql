


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "core";


ALTER SCHEMA "core" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "openpeople";


ALTER SCHEMA "openpeople" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "personal";


ALTER SCHEMA "personal" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "realestate";


ALTER SCHEMA "realestate" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "reflection";


ALTER SCHEMA "reflection" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."generate_inventory_health_report"("p_report_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."generate_inventory_health_report"("p_report_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_customer_id"("p_email" "text", "p_full_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  existing_id integer;
  clean_email text := nullif(trim(p_email), '');
  clean_phone text := nullif(trim(p_phone), '');
  match_email text := case when clean_email is not null then lower(clean_email) end;
  trimmed_name text := nullif(trim(p_full_name), '');
  first_value text := null;
  last_value text := null;
begin
  if trimmed_name is not null then
    first_value := split_part(trimmed_name, ' ', 1);
    last_value := nullif(regexp_replace(trimmed_name, '^\S+\s*', ''), '');
  end if;

  -- Try email match first
  if match_email is not null then
    select id into existing_id
    from customers
    where lower(email) = match_email
    limit 1;
  end if;

  -- Try phone match if no email match
  if existing_id is null and clean_phone is not null then
    select id into existing_id
    from customers
    where phone = clean_phone
    limit 1;
  end if;

  -- Create new customer if not found
  if existing_id is null then
    insert into customers (email, phone, name, first_name, last_name)
    values (clean_email, clean_phone, trimmed_name, first_value, last_value)
    returning id into existing_id;
  else
    -- Update existing record with any new info
    update customers
    set
      email = coalesce(customers.email, clean_email),
      phone = coalesce(customers.phone, clean_phone),
      name = coalesce(customers.name, trimmed_name),
      first_name = coalesce(customers.first_name, first_value),
      last_name = coalesce(customers.last_name, last_value),
      updated_at = now()
    where id = existing_id;
  end if;

  return existing_id;
end;
$$;


ALTER FUNCTION "public"."get_or_create_customer_id"("p_email" "text", "p_full_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.75, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "source" "text", "source_id" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.source,
    embeddings.source_id,
    embeddings.content,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  FROM embeddings
  WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_alcohol_receiving"("p_item_id" "uuid", "p_bottle_count" numeric, "p_open_volume" numeric, "p_cost_per_bottle" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text" DEFAULT NULL::"text", "p_received_by" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "new_bottle_count" numeric, "new_open_volume" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_alcohol_receiving"("p_item_id" "uuid", "p_bottle_count" numeric, "p_open_volume" numeric, "p_cost_per_bottle" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_alcohol_variance"("p_item_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_expected_volume" numeric, "p_actual_volume" numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "variance_percent" numeric, "variance_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_alcohol_variance"("p_item_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_expected_volume" numeric, "p_actual_volume" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_food_count"("p_item_id" "uuid", "p_counted_quantity" numeric, "p_staff_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "new_on_hand" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_food_count"("p_item_id" "uuid", "p_counted_quantity" numeric, "p_staff_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_food_receiving"("p_item_id" "uuid", "p_quantity" numeric, "p_unit_type" "text", "p_cost_per_unit" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text" DEFAULT NULL::"text", "p_received_by" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("item_id" "uuid", "new_on_hand" numeric, "last_invoice_cost" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_food_receiving"("p_item_id" "uuid", "p_quantity" numeric, "p_unit_type" "text", "p_cost_per_unit" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_food_waste"("p_item_id" "uuid", "p_quantity_lost" numeric, "p_unit_type" "text", "p_reason" "text", "p_staff_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "new_on_hand" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_food_waste"("p_item_id" "uuid", "p_quantity_lost" numeric, "p_unit_type" "text", "p_reason" "text", "p_staff_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "slug" "text", "title" "text", "category" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    swl_embeddings.id,
    swl_embeddings.slug,
    swl_embeddings.title,
    swl_embeddings.category,
    swl_embeddings.content,
    1 - (swl_embeddings.embedding <=> query_embedding) as similarity
  from swl_embeddings
  where 1 - (swl_embeddings.embedding <=> query_embedding) > match_threshold
  order by swl_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) IS 'Search breadcrumbs by semantic similarity using vector embeddings';



CREATE OR REPLACE FUNCTION "public"."set_customers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_customers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_private_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_private_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_staff_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.staff (id, full_name, role, avatar_url, email, last_synced)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    now()
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      avatar_url = excluded.avatar_url,
      email = excluded.email,
      last_synced = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_staff_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_finance_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_finance_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_tokens_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_tokens_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "core"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "type" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "signal_score" numeric DEFAULT 0,
    "noise_score" numeric DEFAULT 0,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reflection_status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "core"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text",
    "content" "jsonb",
    "source" "text",
    "weight" numeric DEFAULT 1,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core"."memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "core"."reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_ids" "uuid"[] NOT NULL,
    "distilled_signal" "text",
    "ethical_impact" "text",
    "operational_impact" "text",
    "cross_system_conflict" "jsonb",
    "emotional_resonance" "jsonb",
    "recommended_action" "text",
    "priority" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "core"."reflections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note" "text" NOT NULL,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "bottle_count" numeric(14,4),
    "open_volume" numeric(14,4),
    "counted_by" "uuid",
    "counted_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."alcohol_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "subcategory" "text",
    "unit_size" "text",
    "bottle_count" numeric(14,4) DEFAULT 0,
    "open_bottle_volume" numeric(14,4),
    "keg_volume_remaining" numeric(14,4),
    "par_level" numeric(14,4),
    "minimum_threshold" numeric(14,4),
    "storage_zone" "text",
    "vendor_id" "uuid",
    "cost_per_bottle" numeric(14,4),
    "cost_per_ounce" numeric(14,4),
    "variance_history" "jsonb" DEFAULT '[]'::"jsonb",
    "cocktail_dependency" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_kegs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "keg_identifier" "text",
    "total_volume" numeric(14,4),
    "remaining_volume" numeric(14,4),
    "weight_kg" numeric(10,3),
    "tapped_at" timestamp with time zone,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_kegs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_pour_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "cocktail_name" "text" NOT NULL,
    "pour_volume" numeric(14,4) NOT NULL,
    "cost_per_cocktail" numeric(14,4),
    "pairing_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_pour_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "vendor_id" "uuid",
    "invoice_ref" "text",
    "cost_per_bottle" numeric(14,4) NOT NULL,
    "cost_per_ounce" numeric(14,4),
    "effective_date" "date" DEFAULT CURRENT_DATE,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_price_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_storage_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "zone" "text" NOT NULL,
    "rack" "text",
    "slot" "text",
    "coordinates" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_storage_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_usage_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "source_type" "text",
    "source_id" "text",
    "quantity_used" numeric(14,4) NOT NULL,
    "unit_type" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."alcohol_usage_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_variance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "expected_volume" numeric(14,4),
    "actual_volume" numeric(14,4),
    "variance_percent" numeric(6,3),
    "variance_value" numeric(14,4),
    "bartending_accuracy" numeric(6,3),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_variance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_vendor_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "vendor_id" "uuid",
    "accuracy_score" numeric(4,2),
    "breakage_events" integer DEFAULT 0,
    "last_ordered_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alcohol_vendor_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alcohol_waste" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "quantity_lost" numeric(14,4) NOT NULL,
    "unit_type" "text",
    "reason" "text",
    "staff_id" "uuid",
    "cost_impact" numeric(14,4),
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."alcohol_waste" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "weekday" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "capacity" numeric DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text",
    "device_label" "text",
    "persona" "text",
    "title" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "origin" "text" DEFAULT 'ui'::"text",
    "raw_input" "text",
    "nl_confidence" double precision DEFAULT 1.0
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."calendar_events"."origin" IS 'Source of event creation: chat, ui, automation, imported, ai';



COMMENT ON COLUMN "public"."calendar_events"."raw_input" IS 'Original natural language input from chat (if applicable)';



COMMENT ON COLUMN "public"."calendar_events"."nl_confidence" IS 'Confidence score (0.0-1.0) of natural language parsing';



CREATE TABLE IF NOT EXISTS "public"."commitments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "title" "text" NOT NULL,
    "due_date" "date",
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commitments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."context_timeline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "entities" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."context_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_type" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text",
    "message" "text",
    "triggered_at" timestamp with time zone DEFAULT "now"(),
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."cost_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_interactions" (
    "id" bigint NOT NULL,
    "customer_id" integer,
    "email" "text",
    "interaction_type" "text" NOT NULL,
    "channel" "text" DEFAULT 'site'::"text",
    "related_table" "text",
    "related_id" "text",
    "summary" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_interactions" IS 'Log of all customer touchpoints across channels';



ALTER TABLE "public"."customer_interactions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."customer_interactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" integer NOT NULL,
    "name" "text",
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "contact" "text",
    "notes" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Core customer/guest records for CRM';



ALTER TABLE "public"."customers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."customers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date",
    "energy" numeric,
    "focus" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_checks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."decision_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "decision" "text" NOT NULL,
    "rationale" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."decision_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."decision_principles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_id" "uuid",
    "statement" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."decision_principles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "module" "text",
    "reference_type" "text",
    "reference_id" "text",
    "delivered_at" timestamp with time zone DEFAULT "now"(),
    "received_by" "uuid",
    "status" "text",
    "issues" "jsonb" DEFAULT '[]'::"jsonb",
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_type" "text" NOT NULL,
    "device_name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "trust_level" "text" DEFAULT 'pending'::"text",
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_identity_links" (
    "device_id" "text" NOT NULL,
    "user_id" "uuid",
    "device_label" "text",
    "default_persona" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_identity_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_modes" (
    "device_id" "text" NOT NULL,
    "device_label" "text",
    "persona" "text",
    "mode" "text",
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_modes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text",
    "persona" "text",
    "mode" "text",
    "source" "text",
    "source_id" "text",
    "content" "text",
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "role_id" "uuid",
    "intention_alignment" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_merchants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "canonical_name" "text" NOT NULL,
    "category" "text",
    "icon" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finance_merchants" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_merchants" IS 'Canonical merchants and metadata';



CREATE TABLE IF NOT EXISTS "public"."finance_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid",
    "device_id" "text" NOT NULL,
    "merchant" "text" NOT NULL,
    "total" numeric NOT NULL,
    "tax" numeric DEFAULT 0,
    "timestamp" timestamp with time zone NOT NULL,
    "image_url" "text",
    "raw_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finance_receipts" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_receipts" IS 'Receipt records linked to transactions';



CREATE TABLE IF NOT EXISTS "public"."finance_reflection_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "transaction_ids" "uuid"[],
    "summary" "text" NOT NULL,
    "alignment_score" numeric,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finance_reflection_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_reflection_events" IS 'Summaries/tags derived from transactions';



CREATE TABLE IF NOT EXISTS "public"."finance_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_id" "text" NOT NULL,
    "source" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "merchant" "text" NOT NULL,
    "category" "text",
    "timestamp" timestamp with time zone NOT NULL,
    "location" "jsonb",
    "account_id" "text",
    "notes" "text",
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finance_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."finance_transactions" IS 'Financial transactions ingested from multiple sources';



CREATE TABLE IF NOT EXISTS "public"."food_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "counted_quantity" numeric(14,4) NOT NULL,
    "variance" numeric(14,4),
    "counted_by" "uuid",
    "counted_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."food_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "subcategory" "text",
    "unit_type" "text" NOT NULL,
    "on_hand_quantity" numeric(14,4) DEFAULT 0,
    "par_level" numeric(14,4),
    "minimum_threshold" numeric(14,4),
    "storage_zone" "text",
    "vendor_id" "uuid",
    "shelf_life_days" integer,
    "expiry_date" "date",
    "yield_percent" numeric(6,3),
    "waste_percent" numeric(6,3),
    "cost_per_unit" numeric(14,4),
    "last_invoice_cost" numeric(14,4),
    "usage_frequency" numeric(10,3),
    "recipe_dependency" "jsonb" DEFAULT '[]'::"jsonb",
    "ai_price_baseline" numeric(14,4),
    "cost_drift_percent" numeric(6,3),
    "last_counted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_par_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "season" "text",
    "par_level" numeric(14,4) NOT NULL,
    "minimum_threshold" numeric(14,4),
    "effective_start" "date" DEFAULT CURRENT_DATE,
    "effective_end" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_par_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "vendor_id" "uuid",
    "invoice_ref" "text",
    "cost_per_unit" numeric(14,4) NOT NULL,
    "effective_date" "date" DEFAULT CURRENT_DATE,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_price_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_storage_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "zone" "text" NOT NULL,
    "shelf" "text",
    "bin_label" "text",
    "coordinates" "jsonb" DEFAULT '{}'::"jsonb",
    "capacity" numeric(14,4),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_storage_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_usage_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "source_type" "text",
    "source_id" "text",
    "quantity_used" numeric(14,4) NOT NULL,
    "unit_type" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."food_usage_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_vendor_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "vendor_id" "uuid",
    "punctuality_score" numeric(4,2),
    "quality_score" numeric(4,2),
    "substitution_events" integer DEFAULT 0,
    "last_ordered_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_vendor_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_waste" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "quantity_lost" numeric(14,4) NOT NULL,
    "unit_type" "text",
    "reason" "text",
    "staff_id" "uuid",
    "cost_impact" numeric(14,4),
    "adjustments" "jsonb" DEFAULT '{}'::"jsonb",
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_waste" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gate_auth_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "intent" "text" NOT NULL,
    "success" boolean NOT NULL,
    "role" "text",
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gate_auth_log_intent_check" CHECK (("intent" = ANY (ARRAY['login'::"text", 'register'::"text", 'password_reset'::"text"])))
);


ALTER TABLE "public"."gate_auth_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gmail_oauth_states" (
    "device_id" "text" NOT NULL,
    "state" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gmail_oauth_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gmail_tokens" (
    "device_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token_encrypted" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gmail_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."identities" (
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "email" "text",
    "primary_persona" "text" DEFAULT 'Personal'::"text",
    "active_persona" "text" DEFAULT 'Personal'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."identities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."identity_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity" "text" NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."identity_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."imap_configs" (
    "device_id" "text" NOT NULL,
    "username" "text" NOT NULL,
    "app_password_encrypted" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."imap_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_date" "date" NOT NULL,
    "shortages" "jsonb" DEFAULT '[]'::"jsonb",
    "projected_shortages" "jsonb" DEFAULT '[]'::"jsonb",
    "waste_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "vendor_issues" "jsonb" DEFAULT '[]'::"jsonb",
    "cost_drift" "jsonb" DEFAULT '{}'::"jsonb",
    "alcohol_variance" "jsonb" DEFAULT '{}'::"jsonb",
    "prep_feasibility" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_recommendations" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_id" "uuid",
    "media_url" "text" NOT NULL,
    "media_type" "text",
    "attached_to_table" "text",
    "attached_to_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid",
    "note" "text" NOT NULL,
    "related_module" "text",
    "related_table" "text",
    "related_id" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_notes_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_id" "uuid",
    "link_type" "text",
    "target_table" "text",
    "target_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_notes_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."journal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "body" "text" NOT NULL,
    "sentiment" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."journals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."life_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."life_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manual_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."manual_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memory_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "source_message" "uuid" NOT NULL,
    "related_reflection" "uuid",
    "related_message" "uuid",
    "related_task" "uuid",
    "related_event" "uuid",
    "weight" double precision DEFAULT 0.5 NOT NULL,
    "link_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "memory_links_link_type_check" CHECK (("link_type" = ANY (ARRAY['reflection'::"text", 'message'::"text", 'task'::"text", 'event'::"text", 'theme'::"text"])))
);


ALTER TABLE "public"."memory_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text",
    "device_label" "text",
    "persona" "text",
    "source" "text",
    "sender" "text",
    "subject" "text",
    "body" "text",
    "thread_key" "text",
    "direction" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opening_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "customer_id" integer,
    "email" "text" NOT NULL,
    "preferred_date" "date",
    "party_size" integer,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."opening_reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."opening_reservations" IS 'Early access / opening week reservation requests';



CREATE TABLE IF NOT EXISTS "public"."os_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_message" "text" NOT NULL,
    "system_context" "jsonb",
    "assistant_reply" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."os_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."os_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."os_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."os_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "capabilities" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."os_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patterns_detected" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reflection_id" "uuid",
    "embedding" "public"."vector"(8),
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patterns_detected" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "context" "text",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_north_star" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement" "text" NOT NULL,
    "horizon" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."personal_north_star" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."personal_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid",
    "title" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."personal_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_check_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_id" "uuid",
    "menu_item_id" "uuid",
    "seat_label" "text",
    "qty" integer DEFAULT 1 NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "display_name" "text" NOT NULL,
    "modifier_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "modifier_notes" "text",
    "comp" boolean DEFAULT false,
    "split_mode" "text" DEFAULT 'none'::"text",
    "transfer_to" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_check_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0,
    "tax" numeric(10,2) DEFAULT 0,
    "service" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) DEFAULT 0,
    "comp_total" numeric(10,2) DEFAULT 0,
    "receipt_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "closed_by" "uuid"
);


ALTER TABLE "public"."pos_checks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_device_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "staff_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "trust_level" "text" DEFAULT 'pending'::"text",
    "notes" "text"
);


ALTER TABLE "public"."pos_device_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_menu_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "color" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_menu_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "group_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "available" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_menu_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_modifier_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_modifier_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_modifiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "label" "text" NOT NULL,
    "default_applied" boolean DEFAULT false,
    "extra_cost" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_modifiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "tip_amount" numeric(10,2) DEFAULT 0,
    "method" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "processor" "text",
    "processor_charge_id" "text",
    "device_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."pos_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_id" "uuid",
    "reservation_id" integer,
    "started_by" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "party_size" integer,
    "opened_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "notes" "text"
);


ALTER TABLE "public"."pos_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "zone" "text" NOT NULL,
    "seats" integer DEFAULT 2 NOT NULL,
    "can_combine" boolean DEFAULT false,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_tables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "customer_id" integer,
    "guest_name" "text" NOT NULL,
    "guest_email" "text",
    "organization" "text",
    "event_type" "text" DEFAULT 'Private Experience'::"text",
    "party_size" integer,
    "preferred_date" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "menu_style" "text",
    "budget_range" "text",
    "special_requests" "text",
    "status" "text" DEFAULT 'inquiry'::"text" NOT NULL,
    "proposal_text" "text",
    "proposal_pdf_url" "text",
    "contract_signed" boolean DEFAULT false,
    "deposit_amount" numeric(10,2),
    "deposit_paid" boolean DEFAULT false,
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "reflection_prompt_sent" boolean DEFAULT false,
    "notes_internal" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."private_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."private_events" IS 'Private dining experience requests and pipeline tracking';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_id" "uuid",
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "fcm_token" "text" NOT NULL,
    "platform" "text" DEFAULT 'ios'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "device_id" "text" NOT NULL,
    "push_token" "text" NOT NULL,
    "platform" "text" DEFAULT 'ios'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raw_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_path" "text" NOT NULL,
    "source" "text" DEFAULT 'ios-app'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vendor" "text",
    "receipt_date" "date",
    "subtotal" numeric(10,2),
    "tax" numeric(10,2),
    "total" numeric(10,2),
    "currency" "text" DEFAULT 'CAD'::"text",
    "payment_method" "text",
    "notes" "text",
    "ocr_text" "text",
    "source_id" "text",
    CONSTRAINT "raw_receipts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'parsed'::"text", 'verified'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."raw_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reflection_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "summary" "text" NOT NULL,
    "period" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reflection_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "journal_id" "uuid",
    "insight" "text",
    "drift_detected" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reflections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" integer NOT NULL,
    "customer_id" integer,
    "guest_name" "text",
    "guest_contact" "text",
    "party_size" integer,
    "reservation_time" timestamp without time zone,
    "expected_table_ids" integer[],
    "preassigned_seat_map" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "occasion" "text",
    "allergies" "text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservations" IS 'Restaurant table reservations';



ALTER TABLE "public"."reservations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reservations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cadence" "text" NOT NULL,
    "steps" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scale_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "connection_type" "text" NOT NULL,
    "station" "text",
    "auto_sync" boolean DEFAULT false,
    "last_calibrated" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scale_profiles_connection_type_check" CHECK (("connection_type" = ANY (ARRAY['usb'::"text", 'ble'::"text", 'wifi'::"text"])))
);


ALTER TABLE "public"."scale_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."semantic_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "message_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."semantic_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text",
    "avatar_url" "text",
    "email" "text",
    "last_synced" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "must_reset" boolean DEFAULT false,
    "role" "text" DEFAULT 'staff'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner" "text" NOT NULL,
    "title" "text",
    "summary" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_reflections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."swl_breadcrumb_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "processed_at" timestamp with time zone,
    "result_file" "text",
    "error_message" "text",
    CONSTRAINT "swl_breadcrumb_queue_category_check" CHECK (("category" = ANY (ARRAY['identity'::"text", 'ethos'::"text", 'practice'::"text", 'cuisine'::"text", 'context'::"text", 'hospitality'::"text", 'operations'::"text", 'people'::"text"]))),
    CONSTRAINT "swl_breadcrumb_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'complete'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."swl_breadcrumb_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."swl_breadcrumb_queue" IS 'Queue for staff-submitted breadcrumb requests awaiting AI processing';



CREATE TABLE IF NOT EXISTS "public"."swl_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text",
    "category" "text",
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."swl_embeddings" OWNER TO "postgres";


COMMENT ON TABLE "public"."swl_embeddings" IS 'Vector embeddings for breadcrumb semantic search and LLM discoverability';



CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "commitment_id" "uuid",
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "energy_cost" numeric,
    "time_cost" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "due_at" timestamp with time zone,
    "source" "text",
    "origin" "text" DEFAULT 'ui'::"text",
    "raw_input" "text",
    "nl_confidence" double precision DEFAULT 1.0,
    "device_id" "text" NOT NULL,
    "device_label" "text",
    "persona" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."origin" IS 'Source of task creation: chat, ui, automation, imported, ai';



COMMENT ON COLUMN "public"."tasks"."raw_input" IS 'Original natural language input from chat (if applicable)';



COMMENT ON COLUMN "public"."tasks"."nl_confidence" IS 'Confidence score (0.0-1.0) of natural language parsing';



COMMENT ON COLUMN "public"."tasks"."device_id" IS 'Device identifier for the task owner';



CREATE TABLE IF NOT EXISTS "public"."twilio_configs" (
    "device_id" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."twilio_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "photo_url" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['boh'::"text", 'foh'::"text", 'manager'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_security" (
    "user_id" "uuid" NOT NULL,
    "mfa_enabled" boolean DEFAULT false,
    "last_reset_at" timestamp with time zone,
    "active_sessions" "jsonb" DEFAULT '[]'::"jsonb",
    "trusted_devices" "jsonb" DEFAULT '[]'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_security" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "address" "text",
    "punctuality_rating" numeric(4,2),
    "cost_drift_percent" numeric(6,3),
    "communication_score" numeric(4,2),
    "substitution_frequency" numeric(6,3),
    "weekend_reliability" numeric(4,2),
    "seasonal_performance" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "active" boolean DEFAULT true,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendor_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "core"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."memory"
    ADD CONSTRAINT "memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "core"."reflections"
    ADD CONSTRAINT "reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_notes"
    ADD CONSTRAINT "ai_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_counts"
    ADD CONSTRAINT "alcohol_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_inventory_items"
    ADD CONSTRAINT "alcohol_inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_kegs"
    ADD CONSTRAINT "alcohol_kegs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_pour_templates"
    ADD CONSTRAINT "alcohol_pour_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_price_history"
    ADD CONSTRAINT "alcohol_price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_storage_map"
    ADD CONSTRAINT "alcohol_storage_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_usage_history"
    ADD CONSTRAINT "alcohol_usage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_variance"
    ADD CONSTRAINT "alcohol_variance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_vendor_history"
    ADD CONSTRAINT "alcohol_vendor_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alcohol_waste"
    ADD CONSTRAINT "alcohol_waste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commitments"
    ADD CONSTRAINT "commitments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."context_timeline"
    ADD CONSTRAINT "context_timeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_alerts"
    ADD CONSTRAINT "cost_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_checks"
    ADD CONSTRAINT "daily_checks_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."daily_checks"
    ADD CONSTRAINT "daily_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."decision_history"
    ADD CONSTRAINT "decision_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."decision_principles"
    ADD CONSTRAINT "decision_principles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_logs"
    ADD CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_connections"
    ADD CONSTRAINT "device_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_identity_links"
    ADD CONSTRAINT "device_identity_links_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."device_modes"
    ADD CONSTRAINT "device_modes_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."embeddings"
    ADD CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_references"
    ADD CONSTRAINT "external_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_merchants"
    ADD CONSTRAINT "finance_merchants_canonical_name_key" UNIQUE ("canonical_name");



ALTER TABLE ONLY "public"."finance_merchants"
    ADD CONSTRAINT "finance_merchants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_receipts"
    ADD CONSTRAINT "finance_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_reflection_events"
    ADD CONSTRAINT "finance_reflection_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_transactions"
    ADD CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_counts"
    ADD CONSTRAINT "food_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_inventory_items"
    ADD CONSTRAINT "food_inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_par_levels"
    ADD CONSTRAINT "food_par_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_price_history"
    ADD CONSTRAINT "food_price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_storage_map"
    ADD CONSTRAINT "food_storage_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_usage_history"
    ADD CONSTRAINT "food_usage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_vendor_history"
    ADD CONSTRAINT "food_vendor_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_waste"
    ADD CONSTRAINT "food_waste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gate_auth_log"
    ADD CONSTRAINT "gate_auth_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gmail_oauth_states"
    ADD CONSTRAINT "gmail_oauth_states_pkey" PRIMARY KEY ("state");



ALTER TABLE ONLY "public"."gmail_tokens"
    ADD CONSTRAINT "gmail_tokens_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."identity_versions"
    ADD CONSTRAINT "identity_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."imap_configs"
    ADD CONSTRAINT "imap_configs_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."inbox"
    ADD CONSTRAINT "inbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_health"
    ADD CONSTRAINT "inventory_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_health"
    ADD CONSTRAINT "inventory_health_report_date_key" UNIQUE ("report_date");



ALTER TABLE ONLY "public"."inventory_media"
    ADD CONSTRAINT "inventory_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_notes_links"
    ADD CONSTRAINT "inventory_notes_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_notes"
    ADD CONSTRAINT "inventory_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journals"
    ADD CONSTRAINT "journals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_domains"
    ADD CONSTRAINT "life_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_log"
    ADD CONSTRAINT "life_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_events"
    ADD CONSTRAINT "manual_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memory_links"
    ADD CONSTRAINT "memory_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opening_reservations"
    ADD CONSTRAINT "opening_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."os_chats"
    ADD CONSTRAINT "os_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."os_events"
    ADD CONSTRAINT "os_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."os_modules"
    ADD CONSTRAINT "os_modules_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."os_modules"
    ADD CONSTRAINT "os_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patterns_detected"
    ADD CONSTRAINT "patterns_detected_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_north_star"
    ADD CONSTRAINT "personal_north_star_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_roles"
    ADD CONSTRAINT "personal_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_values"
    ADD CONSTRAINT "personal_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_check_lines"
    ADD CONSTRAINT "pos_check_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_checks"
    ADD CONSTRAINT "pos_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_device_sessions"
    ADD CONSTRAINT "pos_device_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_menu_categories"
    ADD CONSTRAINT "pos_menu_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_menu_items"
    ADD CONSTRAINT "pos_menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_modifier_groups"
    ADD CONSTRAINT "pos_modifier_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_modifiers"
    ADD CONSTRAINT "pos_modifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_payments"
    ADD CONSTRAINT "pos_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_tables"
    ADD CONSTRAINT "pos_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_events"
    ADD CONSTRAINT "private_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("device_id", "platform");



ALTER TABLE ONLY "public"."raw_receipts"
    ADD CONSTRAINT "raw_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reflection_summaries"
    ADD CONSTRAINT "reflection_summaries_period_unique" UNIQUE ("period");



ALTER TABLE ONLY "public"."reflection_summaries"
    ADD CONSTRAINT "reflection_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reflections"
    ADD CONSTRAINT "reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scale_profiles"
    ADD CONSTRAINT "scale_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."semantic_threads"
    ADD CONSTRAINT "semantic_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_access"
    ADD CONSTRAINT "staff_access_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff_access"
    ADD CONSTRAINT "staff_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_reflections"
    ADD CONSTRAINT "staff_reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swl_breadcrumb_queue"
    ADD CONSTRAINT "swl_breadcrumb_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swl_embeddings"
    ADD CONSTRAINT "swl_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swl_embeddings"
    ADD CONSTRAINT "swl_embeddings_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."twilio_configs"
    ADD CONSTRAINT "twilio_configs_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("user_id", "notification_type");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_security"
    ADD CONSTRAINT "user_security_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "alcohol_inventory_vendor_idx" ON "public"."alcohol_inventory_items" USING "btree" ("vendor_id");



CREATE INDEX "cost_alerts_item_idx" ON "public"."cost_alerts" USING "btree" ("item_type", "item_id");



CREATE INDEX "customer_interactions_customer_idx" ON "public"."customer_interactions" USING "btree" ("customer_id");



CREATE INDEX "customer_interactions_email_idx" ON "public"."customer_interactions" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "customer_interactions_type_idx" ON "public"."customer_interactions" USING "btree" ("interaction_type", "created_at" DESC);



CREATE INDEX "customers_email_idx" ON "public"."customers" USING "btree" ("email");



CREATE UNIQUE INDEX "customers_email_lower_uidx" ON "public"."customers" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "customers_phone_idx" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "device_connections_user_idx" ON "public"."device_connections" USING "btree" ("user_id");



CREATE INDEX "embeddings_device_id_idx" ON "public"."embeddings" USING "btree" ("device_id");



CREATE INDEX "embeddings_embedding_idx" ON "public"."embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "embeddings_source_idx" ON "public"."embeddings" USING "btree" ("source", "source_id");



CREATE UNIQUE INDEX "external_references_hash_idx" ON "public"."external_references" USING "btree" ("payload_hash");



CREATE INDEX "food_inventory_vendor_idx" ON "public"."food_inventory_items" USING "btree" ("vendor_id");



CREATE INDEX "food_waste_item_idx" ON "public"."food_waste" USING "btree" ("item_id", "recorded_at" DESC);



CREATE INDEX "gate_auth_log_created_at_idx" ON "public"."gate_auth_log" USING "btree" ("created_at" DESC);



CREATE INDEX "gate_auth_log_email_idx" ON "public"."gate_auth_log" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "gate_auth_log_success_idx" ON "public"."gate_auth_log" USING "btree" ("success", "created_at" DESC);



CREATE INDEX "gate_auth_log_user_id_idx" ON "public"."gate_auth_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_breadcrumb_queue_created_at" ON "public"."swl_breadcrumb_queue" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_breadcrumb_queue_status" ON "public"."swl_breadcrumb_queue" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_calendar_events_origin" ON "public"."calendar_events" USING "btree" ("origin");



CREATE INDEX "idx_finance_merchants_canonical_name" ON "public"."finance_merchants" USING "btree" ("canonical_name");



CREATE INDEX "idx_finance_merchants_category" ON "public"."finance_merchants" USING "btree" ("category");



CREATE INDEX "idx_finance_receipts_device_id" ON "public"."finance_receipts" USING "btree" ("device_id");



CREATE INDEX "idx_finance_receipts_merchant" ON "public"."finance_receipts" USING "btree" ("merchant");



CREATE INDEX "idx_finance_receipts_timestamp" ON "public"."finance_receipts" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_finance_receipts_transaction_id" ON "public"."finance_receipts" USING "btree" ("transaction_id");



CREATE INDEX "idx_finance_reflection_events_created_at" ON "public"."finance_reflection_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_finance_reflection_events_device_id" ON "public"."finance_reflection_events" USING "btree" ("device_id");



CREATE INDEX "idx_finance_reflection_events_tags" ON "public"."finance_reflection_events" USING "gin" ("tags");



CREATE INDEX "idx_finance_transactions_category" ON "public"."finance_transactions" USING "btree" ("category");



CREATE INDEX "idx_finance_transactions_device_id" ON "public"."finance_transactions" USING "btree" ("device_id");



CREATE INDEX "idx_finance_transactions_merchant" ON "public"."finance_transactions" USING "btree" ("merchant");



CREATE INDEX "idx_finance_transactions_source" ON "public"."finance_transactions" USING "btree" ("source");



CREATE INDEX "idx_finance_transactions_timestamp" ON "public"."finance_transactions" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_finance_transactions_user_id" ON "public"."finance_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_gmail_oauth_states_device_id" ON "public"."gmail_oauth_states" USING "btree" ("device_id");



CREATE INDEX "idx_gmail_oauth_states_state" ON "public"."gmail_oauth_states" USING "btree" ("state");



CREATE INDEX "idx_gmail_tokens_device_id" ON "public"."gmail_tokens" USING "btree" ("device_id");



CREATE INDEX "idx_imap_configs_device_id" ON "public"."imap_configs" USING "btree" ("device_id");



CREATE INDEX "idx_memory_links_device_id" ON "public"."memory_links" USING "btree" ("device_id");



CREATE INDEX "idx_memory_links_link_type" ON "public"."memory_links" USING "btree" ("link_type");



CREATE INDEX "idx_memory_links_related_reflection" ON "public"."memory_links" USING "btree" ("related_reflection");



CREATE INDEX "idx_memory_links_source_message" ON "public"."memory_links" USING "btree" ("source_message");



CREATE INDEX "idx_memory_links_weight" ON "public"."memory_links" USING "btree" ("weight" DESC);



CREATE INDEX "idx_push_tokens_device_id" ON "public"."push_tokens" USING "btree" ("device_id");



CREATE INDEX "idx_push_tokens_push_token" ON "public"."push_tokens" USING "btree" ("push_token");



CREATE INDEX "idx_raw_receipts_created_at" ON "public"."raw_receipts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_raw_receipts_source_id" ON "public"."raw_receipts" USING "btree" ("source_id");



CREATE INDEX "idx_semantic_threads_created_at" ON "public"."semantic_threads" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_semantic_threads_device_id" ON "public"."semantic_threads" USING "btree" ("device_id");



CREATE INDEX "idx_semantic_threads_embedding" ON "public"."semantic_threads" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_swl_embeddings_category" ON "public"."swl_embeddings" USING "btree" ("category");



CREATE INDEX "idx_swl_embeddings_embedding" ON "public"."swl_embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_swl_embeddings_slug" ON "public"."swl_embeddings" USING "btree" ("slug");



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tasks_device_id" ON "public"."tasks" USING "btree" ("device_id");



CREATE INDEX "idx_tasks_origin" ON "public"."tasks" USING "btree" ("origin");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_twilio_configs_device_id" ON "public"."twilio_configs" USING "btree" ("device_id");



CREATE INDEX "idx_twilio_configs_phone_number" ON "public"."twilio_configs" USING "btree" ("phone_number");



CREATE INDEX "inbox_resolved_idx" ON "public"."inbox" USING "btree" ("resolved");



CREATE INDEX "journal_entries_created_idx" ON "public"."journal_entries" USING "btree" ("created_at" DESC);



CREATE INDEX "manual_events_starts_idx" ON "public"."manual_events" USING "btree" ("starts_at");



CREATE INDEX "opening_reservations_customer_idx" ON "public"."opening_reservations" USING "btree" ("customer_id");



CREATE INDEX "opening_reservations_email_idx" ON "public"."opening_reservations" USING "btree" ("email");



CREATE INDEX "opening_reservations_preferred_date_idx" ON "public"."opening_reservations" USING "btree" ("preferred_date");



CREATE INDEX "opening_reservations_status_idx" ON "public"."opening_reservations" USING "btree" ("status");



CREATE INDEX "people_updated_idx" ON "public"."people" USING "btree" ("updated_at" DESC);



CREATE INDEX "pos_check_lines_check_idx" ON "public"."pos_check_lines" USING "btree" ("check_id");



CREATE INDEX "pos_checks_session_idx" ON "public"."pos_checks" USING "btree" ("session_id");



CREATE INDEX "pos_menu_items_category_idx" ON "public"."pos_menu_items" USING "btree" ("category_id");



CREATE INDEX "pos_payments_check_idx" ON "public"."pos_payments" USING "btree" ("check_id");



CREATE INDEX "pos_sessions_table_idx" ON "public"."pos_sessions" USING "btree" ("table_id") WHERE ("status" <> 'closed'::"text");



CREATE INDEX "pos_tables_zone_idx" ON "public"."pos_tables" USING "btree" ("zone");



CREATE INDEX "private_events_customer_idx" ON "public"."private_events" USING "btree" ("customer_id");



CREATE INDEX "private_events_guest_email_idx" ON "public"."private_events" USING "btree" ("guest_email");



CREATE INDEX "private_events_preferred_date_idx" ON "public"."private_events" USING "btree" ("preferred_date");



CREATE INDEX "private_events_status_idx" ON "public"."private_events" USING "btree" ("status");



CREATE INDEX "private_events_user_idx" ON "public"."private_events" USING "btree" ("user_id");



CREATE INDEX "reservations_customer_idx" ON "public"."reservations" USING "btree" ("customer_id");



CREATE INDEX "reservations_status_idx" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "reservations_time_idx" ON "public"."reservations" USING "btree" ("reservation_time");



CREATE INDEX "staff_reflections_created_idx" ON "public"."staff_reflections" USING "btree" ("created_at" DESC);



CREATE INDEX "system_logs_action_idx" ON "public"."system_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "tasks_due_at_idx" ON "public"."tasks" USING "btree" ("due_at");



CREATE INDEX "tasks_status_idx" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "user_preferences_updated_idx" ON "public"."user_preferences" USING "btree" ("updated_at" DESC);



CREATE INDEX "user_roles_role_idx" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "user_security_updated_idx" ON "public"."user_security" USING "btree" ("updated_at" DESC);



CREATE INDEX "vendor_profiles_active_idx" ON "public"."vendor_profiles" USING "btree" ("active");



CREATE OR REPLACE TRIGGER "set_manual_events_updated_at" BEFORE UPDATE ON "public"."manual_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_customers_updated" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_customers_updated_at"();



CREATE OR REPLACE TRIGGER "trg_private_events_updated" BEFORE UPDATE ON "public"."private_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_private_events_updated_at"();



CREATE OR REPLACE TRIGGER "update_finance_merchants_updated_at" BEFORE UPDATE ON "public"."finance_merchants" FOR EACH ROW EXECUTE FUNCTION "public"."update_finance_updated_at"();



CREATE OR REPLACE TRIGGER "update_finance_receipts_updated_at" BEFORE UPDATE ON "public"."finance_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_finance_updated_at"();



CREATE OR REPLACE TRIGGER "update_finance_transactions_updated_at" BEFORE UPDATE ON "public"."finance_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_finance_updated_at"();



CREATE OR REPLACE TRIGGER "update_push_tokens_updated_at_trigger" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_tokens_updated_at"();



ALTER TABLE ONLY "public"."alcohol_counts"
    ADD CONSTRAINT "alcohol_counts_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."alcohol_counts"
    ADD CONSTRAINT "alcohol_counts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_inventory_items"
    ADD CONSTRAINT "alcohol_inventory_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."alcohol_kegs"
    ADD CONSTRAINT "alcohol_kegs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_pour_templates"
    ADD CONSTRAINT "alcohol_pour_templates_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_price_history"
    ADD CONSTRAINT "alcohol_price_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_price_history"
    ADD CONSTRAINT "alcohol_price_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."alcohol_storage_map"
    ADD CONSTRAINT "alcohol_storage_map_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_usage_history"
    ADD CONSTRAINT "alcohol_usage_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_variance"
    ADD CONSTRAINT "alcohol_variance_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_vendor_history"
    ADD CONSTRAINT "alcohol_vendor_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_vendor_history"
    ADD CONSTRAINT "alcohol_vendor_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."alcohol_waste"
    ADD CONSTRAINT "alcohol_waste_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."alcohol_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alcohol_waste"
    ADD CONSTRAINT "alcohol_waste_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."commitments"
    ADD CONSTRAINT "commitments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."decision_principles"
    ADD CONSTRAINT "decision_principles_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."life_domains"("id");



ALTER TABLE ONLY "public"."delivery_logs"
    ADD CONSTRAINT "delivery_logs_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."delivery_logs"
    ADD CONSTRAINT "delivery_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."device_connections"
    ADD CONSTRAINT "device_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_identity_links"
    ADD CONSTRAINT "device_identity_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."identities"("user_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."personal_roles"("id");



ALTER TABLE ONLY "public"."finance_receipts"
    ADD CONSTRAINT "finance_receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."finance_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."food_counts"
    ADD CONSTRAINT "food_counts_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."food_counts"
    ADD CONSTRAINT "food_counts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_inventory_items"
    ADD CONSTRAINT "food_inventory_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."food_par_levels"
    ADD CONSTRAINT "food_par_levels_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_price_history"
    ADD CONSTRAINT "food_price_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_price_history"
    ADD CONSTRAINT "food_price_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."food_storage_map"
    ADD CONSTRAINT "food_storage_map_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_usage_history"
    ADD CONSTRAINT "food_usage_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_vendor_history"
    ADD CONSTRAINT "food_vendor_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_vendor_history"
    ADD CONSTRAINT "food_vendor_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id");



ALTER TABLE ONLY "public"."food_waste"
    ADD CONSTRAINT "food_waste_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."food_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_waste"
    ADD CONSTRAINT "food_waste_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."gate_auth_log"
    ADD CONSTRAINT "gate_auth_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_media"
    ADD CONSTRAINT "inventory_media_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."inventory_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_media"
    ADD CONSTRAINT "inventory_media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."inventory_notes"
    ADD CONSTRAINT "inventory_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."inventory_notes_links"
    ADD CONSTRAINT "inventory_notes_links_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."inventory_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opening_reservations"
    ADD CONSTRAINT "opening_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patterns_detected"
    ADD CONSTRAINT "patterns_detected_reflection_id_fkey" FOREIGN KEY ("reflection_id") REFERENCES "public"."reflections"("id");



ALTER TABLE ONLY "public"."personal_values"
    ADD CONSTRAINT "personal_values_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."personal_roles"("id");



ALTER TABLE ONLY "public"."pos_check_lines"
    ADD CONSTRAINT "pos_check_lines_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "public"."pos_checks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_check_lines"
    ADD CONSTRAINT "pos_check_lines_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."pos_menu_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_checks"
    ADD CONSTRAINT "pos_checks_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_checks"
    ADD CONSTRAINT "pos_checks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_device_sessions"
    ADD CONSTRAINT "pos_device_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."device_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_device_sessions"
    ADD CONSTRAINT "pos_device_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_menu_items"
    ADD CONSTRAINT "pos_menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."pos_menu_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_menu_items"
    ADD CONSTRAINT "pos_menu_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."pos_modifier_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_modifiers"
    ADD CONSTRAINT "pos_modifiers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."pos_modifier_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payments"
    ADD CONSTRAINT "pos_payments_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "public"."pos_checks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payments"
    ADD CONSTRAINT "pos_payments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."device_connections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_sessions"
    ADD CONSTRAINT "pos_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."pos_tables"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."private_events"
    ADD CONSTRAINT "private_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."life_domains"("id");



ALTER TABLE ONLY "public"."reflections"
    ADD CONSTRAINT "reflections_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."swl_breadcrumb_queue"
    ADD CONSTRAINT "swl_breadcrumb_queue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_commitment_id_fkey" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_security"
    ADD CONSTRAINT "user_security_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anon insert/update" ON "public"."push_devices" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role full access to embeddings" ON "public"."embeddings" USING (true);



CREATE POLICY "Allow service role full access to gmail_oauth_states" ON "public"."gmail_oauth_states" USING (true);



CREATE POLICY "Allow service role full access to gmail_tokens" ON "public"."gmail_tokens" USING (true);



CREATE POLICY "Allow service role full access to imap_configs" ON "public"."imap_configs" USING (true);



CREATE POLICY "Allow service role full access to memory_links" ON "public"."memory_links" USING (true);



CREATE POLICY "Allow service role full access to push_tokens" ON "public"."push_tokens" USING (true);



CREATE POLICY "Allow service role full access to semantic_threads" ON "public"."semantic_threads" USING (true);



CREATE POLICY "Allow service role full access to twilio_configs" ON "public"."twilio_configs" USING (true);



CREATE POLICY "Anyone can read embeddings" ON "public"."swl_embeddings" FOR SELECT USING (true);



CREATE POLICY "Messages viewable by all" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "Service role can manage customers" ON "public"."customers" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage interactions" ON "public"."customer_interactions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage opening_reservations" ON "public"."opening_reservations" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage private_events" ON "public"."private_events" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can write embeddings" ON "public"."swl_embeddings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access to breadcrumb queue" ON "public"."swl_breadcrumb_queue" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role manages staff" ON "public"."staff" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages staff_access" ON "public"."staff_access" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Staff can insert breadcrumb requests" ON "public"."swl_breadcrumb_queue" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Staff can view own breadcrumb requests" ON "public"."swl_breadcrumb_queue" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Staff viewable by authenticated" ON "public"."staff" FOR SELECT USING (("auth"."role"() = ANY (ARRAY['authenticated'::"text", 'service_role'::"text"])));



CREATE POLICY "Users can delete their own receipts" ON "public"."finance_receipts" FOR DELETE USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can delete their own transactions" ON "public"."finance_transactions" FOR DELETE USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can insert own messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own receipts" ON "public"."finance_receipts" FOR INSERT WITH CHECK (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can insert their own reflection events" ON "public"."finance_reflection_events" FOR INSERT WITH CHECK (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can insert their own transactions" ON "public"."finance_transactions" FOR INSERT WITH CHECK (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can update their own receipts" ON "public"."finance_receipts" FOR UPDATE USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can update their own transactions" ON "public"."finance_transactions" FOR UPDATE USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can view merchants" ON "public"."finance_merchants" FOR SELECT USING (true);



CREATE POLICY "Users can view own events" ON "public"."private_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reservations" ON "public"."opening_reservations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own receipts" ON "public"."finance_receipts" FOR SELECT USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can view their own reflection events" ON "public"."finance_reflection_events" FOR SELECT USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "Users can view their own transactions" ON "public"."finance_transactions" FOR SELECT USING (("device_id" = "current_setting"('app.device_id'::"text", true)));



CREATE POLICY "anon_delete" ON "public"."raw_receipts" FOR DELETE TO "anon" USING (true);



CREATE POLICY "anon_insert" ON "public"."raw_receipts" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_select" ON "public"."raw_receipts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_update" ON "public"."raw_receipts" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."customer_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_merchants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_reflection_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gate_auth_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gmail_oauth_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gmail_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."imap_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memory_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opening_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raw_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."semantic_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service role can insert gate auth logs" ON "public"."gate_auth_log" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff and owners can read gate auth logs" ON "public"."gate_auth_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."raw_user_meta_data" ->> 'role'::"text") = ANY (ARRAY['staff'::"text", 'owner'::"text"]))))));



ALTER TABLE "public"."staff_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swl_breadcrumb_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swl_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."twilio_configs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."calendar_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_inventory_health_report"("p_report_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_inventory_health_report"("p_report_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_inventory_health_report"("p_report_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_customer_id"("p_email" "text", "p_full_name" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_customer_id"("p_email" "text", "p_full_name" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_customer_id"("p_email" "text", "p_full_name" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_alcohol_receiving"("p_item_id" "uuid", "p_bottle_count" numeric, "p_open_volume" numeric, "p_cost_per_bottle" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_alcohol_receiving"("p_item_id" "uuid", "p_bottle_count" numeric, "p_open_volume" numeric, "p_cost_per_bottle" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_alcohol_receiving"("p_item_id" "uuid", "p_bottle_count" numeric, "p_open_volume" numeric, "p_cost_per_bottle" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_alcohol_variance"("p_item_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_expected_volume" numeric, "p_actual_volume" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_alcohol_variance"("p_item_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_expected_volume" numeric, "p_actual_volume" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_alcohol_variance"("p_item_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_expected_volume" numeric, "p_actual_volume" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_food_count"("p_item_id" "uuid", "p_counted_quantity" numeric, "p_staff_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_food_count"("p_item_id" "uuid", "p_counted_quantity" numeric, "p_staff_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_food_count"("p_item_id" "uuid", "p_counted_quantity" numeric, "p_staff_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_food_receiving"("p_item_id" "uuid", "p_quantity" numeric, "p_unit_type" "text", "p_cost_per_unit" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_food_receiving"("p_item_id" "uuid", "p_quantity" numeric, "p_unit_type" "text", "p_cost_per_unit" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_food_receiving"("p_item_id" "uuid", "p_quantity" numeric, "p_unit_type" "text", "p_cost_per_unit" numeric, "p_vendor_id" "uuid", "p_invoice_ref" "text", "p_received_by" "uuid", "p_notes" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_food_waste"("p_item_id" "uuid", "p_quantity_lost" numeric, "p_unit_type" "text", "p_reason" "text", "p_staff_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_food_waste"("p_item_id" "uuid", "p_quantity_lost" numeric, "p_unit_type" "text", "p_reason" "text", "p_staff_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_food_waste"("p_item_id" "uuid", "p_quantity_lost" numeric, "p_unit_type" "text", "p_reason" "text", "p_staff_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_breadcrumbs"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_customers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_customers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_customers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_private_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_private_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_private_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_staff_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_staff_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_staff_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_finance_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_finance_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_finance_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."ai_notes" TO "anon";
GRANT ALL ON TABLE "public"."ai_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_notes" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_counts" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_counts" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_kegs" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_kegs" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_kegs" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_pour_templates" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_pour_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_pour_templates" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_price_history" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_price_history" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_storage_map" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_storage_map" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_storage_map" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_usage_history" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_usage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_usage_history" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_variance" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_variance" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_variance" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_vendor_history" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_vendor_history" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_vendor_history" TO "service_role";



GRANT ALL ON TABLE "public"."alcohol_waste" TO "anon";
GRANT ALL ON TABLE "public"."alcohol_waste" TO "authenticated";
GRANT ALL ON TABLE "public"."alcohol_waste" TO "service_role";



GRANT ALL ON TABLE "public"."availability" TO "anon";
GRANT ALL ON TABLE "public"."availability" TO "authenticated";
GRANT ALL ON TABLE "public"."availability" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."commitments" TO "anon";
GRANT ALL ON TABLE "public"."commitments" TO "authenticated";
GRANT ALL ON TABLE "public"."commitments" TO "service_role";



GRANT ALL ON TABLE "public"."context_timeline" TO "anon";
GRANT ALL ON TABLE "public"."context_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."context_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."cost_alerts" TO "anon";
GRANT ALL ON TABLE "public"."cost_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_interactions" TO "anon";
GRANT ALL ON TABLE "public"."customer_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_interactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_interactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_interactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_interactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_checks" TO "anon";
GRANT ALL ON TABLE "public"."daily_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_checks" TO "service_role";



GRANT ALL ON TABLE "public"."decision_history" TO "anon";
GRANT ALL ON TABLE "public"."decision_history" TO "authenticated";
GRANT ALL ON TABLE "public"."decision_history" TO "service_role";



GRANT ALL ON TABLE "public"."decision_principles" TO "anon";
GRANT ALL ON TABLE "public"."decision_principles" TO "authenticated";
GRANT ALL ON TABLE "public"."decision_principles" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."device_connections" TO "anon";
GRANT ALL ON TABLE "public"."device_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."device_connections" TO "service_role";



GRANT ALL ON TABLE "public"."device_identity_links" TO "anon";
GRANT ALL ON TABLE "public"."device_identity_links" TO "authenticated";
GRANT ALL ON TABLE "public"."device_identity_links" TO "service_role";



GRANT ALL ON TABLE "public"."device_modes" TO "anon";
GRANT ALL ON TABLE "public"."device_modes" TO "authenticated";
GRANT ALL ON TABLE "public"."device_modes" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings" TO "anon";
GRANT ALL ON TABLE "public"."embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."external_references" TO "anon";
GRANT ALL ON TABLE "public"."external_references" TO "authenticated";
GRANT ALL ON TABLE "public"."external_references" TO "service_role";



GRANT ALL ON TABLE "public"."finance_merchants" TO "anon";
GRANT ALL ON TABLE "public"."finance_merchants" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_merchants" TO "service_role";



GRANT ALL ON TABLE "public"."finance_receipts" TO "anon";
GRANT ALL ON TABLE "public"."finance_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."finance_reflection_events" TO "anon";
GRANT ALL ON TABLE "public"."finance_reflection_events" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_reflection_events" TO "service_role";



GRANT ALL ON TABLE "public"."finance_transactions" TO "anon";
GRANT ALL ON TABLE "public"."finance_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."food_counts" TO "anon";
GRANT ALL ON TABLE "public"."food_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."food_counts" TO "service_role";



GRANT ALL ON TABLE "public"."food_inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."food_inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."food_inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."food_par_levels" TO "anon";
GRANT ALL ON TABLE "public"."food_par_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."food_par_levels" TO "service_role";



GRANT ALL ON TABLE "public"."food_price_history" TO "anon";
GRANT ALL ON TABLE "public"."food_price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."food_price_history" TO "service_role";



GRANT ALL ON TABLE "public"."food_storage_map" TO "anon";
GRANT ALL ON TABLE "public"."food_storage_map" TO "authenticated";
GRANT ALL ON TABLE "public"."food_storage_map" TO "service_role";



GRANT ALL ON TABLE "public"."food_usage_history" TO "anon";
GRANT ALL ON TABLE "public"."food_usage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."food_usage_history" TO "service_role";



GRANT ALL ON TABLE "public"."food_vendor_history" TO "anon";
GRANT ALL ON TABLE "public"."food_vendor_history" TO "authenticated";
GRANT ALL ON TABLE "public"."food_vendor_history" TO "service_role";



GRANT ALL ON TABLE "public"."food_waste" TO "anon";
GRANT ALL ON TABLE "public"."food_waste" TO "authenticated";
GRANT ALL ON TABLE "public"."food_waste" TO "service_role";



GRANT ALL ON TABLE "public"."gate_auth_log" TO "anon";
GRANT ALL ON TABLE "public"."gate_auth_log" TO "authenticated";
GRANT ALL ON TABLE "public"."gate_auth_log" TO "service_role";



GRANT ALL ON TABLE "public"."gmail_oauth_states" TO "anon";
GRANT ALL ON TABLE "public"."gmail_oauth_states" TO "authenticated";
GRANT ALL ON TABLE "public"."gmail_oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."gmail_tokens" TO "anon";
GRANT ALL ON TABLE "public"."gmail_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."gmail_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."identities" TO "anon";
GRANT ALL ON TABLE "public"."identities" TO "authenticated";
GRANT ALL ON TABLE "public"."identities" TO "service_role";



GRANT ALL ON TABLE "public"."identity_versions" TO "anon";
GRANT ALL ON TABLE "public"."identity_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."identity_versions" TO "service_role";



GRANT ALL ON TABLE "public"."imap_configs" TO "anon";
GRANT ALL ON TABLE "public"."imap_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."imap_configs" TO "service_role";



GRANT ALL ON TABLE "public"."inbox" TO "anon";
GRANT ALL ON TABLE "public"."inbox" TO "authenticated";
GRANT ALL ON TABLE "public"."inbox" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_health" TO "anon";
GRANT ALL ON TABLE "public"."inventory_health" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_health" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_media" TO "anon";
GRANT ALL ON TABLE "public"."inventory_media" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_media" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_notes" TO "anon";
GRANT ALL ON TABLE "public"."inventory_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_notes" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_notes_links" TO "anon";
GRANT ALL ON TABLE "public"."inventory_notes_links" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_notes_links" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."journals" TO "anon";
GRANT ALL ON TABLE "public"."journals" TO "authenticated";
GRANT ALL ON TABLE "public"."journals" TO "service_role";



GRANT ALL ON TABLE "public"."life_domains" TO "anon";
GRANT ALL ON TABLE "public"."life_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."life_domains" TO "service_role";



GRANT ALL ON TABLE "public"."life_log" TO "anon";
GRANT ALL ON TABLE "public"."life_log" TO "authenticated";
GRANT ALL ON TABLE "public"."life_log" TO "service_role";



GRANT ALL ON TABLE "public"."manual_events" TO "anon";
GRANT ALL ON TABLE "public"."manual_events" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_events" TO "service_role";



GRANT ALL ON TABLE "public"."memory_links" TO "anon";
GRANT ALL ON TABLE "public"."memory_links" TO "authenticated";
GRANT ALL ON TABLE "public"."memory_links" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."opening_reservations" TO "anon";
GRANT ALL ON TABLE "public"."opening_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."opening_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."os_chats" TO "anon";
GRANT ALL ON TABLE "public"."os_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."os_chats" TO "service_role";



GRANT ALL ON TABLE "public"."os_events" TO "anon";
GRANT ALL ON TABLE "public"."os_events" TO "authenticated";
GRANT ALL ON TABLE "public"."os_events" TO "service_role";



GRANT ALL ON TABLE "public"."os_modules" TO "anon";
GRANT ALL ON TABLE "public"."os_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."os_modules" TO "service_role";



GRANT ALL ON TABLE "public"."patterns_detected" TO "anon";
GRANT ALL ON TABLE "public"."patterns_detected" TO "authenticated";
GRANT ALL ON TABLE "public"."patterns_detected" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."personal_north_star" TO "anon";
GRANT ALL ON TABLE "public"."personal_north_star" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_north_star" TO "service_role";



GRANT ALL ON TABLE "public"."personal_roles" TO "anon";
GRANT ALL ON TABLE "public"."personal_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_roles" TO "service_role";



GRANT ALL ON TABLE "public"."personal_values" TO "anon";
GRANT ALL ON TABLE "public"."personal_values" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_values" TO "service_role";



GRANT ALL ON TABLE "public"."pos_check_lines" TO "anon";
GRANT ALL ON TABLE "public"."pos_check_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_check_lines" TO "service_role";



GRANT ALL ON TABLE "public"."pos_checks" TO "anon";
GRANT ALL ON TABLE "public"."pos_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_checks" TO "service_role";



GRANT ALL ON TABLE "public"."pos_device_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pos_device_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_device_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."pos_menu_categories" TO "anon";
GRANT ALL ON TABLE "public"."pos_menu_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_menu_categories" TO "service_role";



GRANT ALL ON TABLE "public"."pos_menu_items" TO "anon";
GRANT ALL ON TABLE "public"."pos_menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."pos_modifier_groups" TO "anon";
GRANT ALL ON TABLE "public"."pos_modifier_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_modifier_groups" TO "service_role";



GRANT ALL ON TABLE "public"."pos_modifiers" TO "anon";
GRANT ALL ON TABLE "public"."pos_modifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_modifiers" TO "service_role";



GRANT ALL ON TABLE "public"."pos_payments" TO "anon";
GRANT ALL ON TABLE "public"."pos_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_payments" TO "service_role";



GRANT ALL ON TABLE "public"."pos_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pos_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."pos_tables" TO "anon";
GRANT ALL ON TABLE "public"."pos_tables" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_tables" TO "service_role";



GRANT ALL ON TABLE "public"."private_events" TO "anon";
GRANT ALL ON TABLE "public"."private_events" TO "authenticated";
GRANT ALL ON TABLE "public"."private_events" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."push_devices" TO "anon";
GRANT ALL ON TABLE "public"."push_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."push_devices" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."raw_receipts" TO "anon";
GRANT ALL ON TABLE "public"."raw_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."reflection_summaries" TO "anon";
GRANT ALL ON TABLE "public"."reflection_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."reflection_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."reflections" TO "anon";
GRANT ALL ON TABLE "public"."reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."reflections" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT ALL ON TABLE "public"."routines" TO "service_role";



GRANT ALL ON TABLE "public"."scale_profiles" TO "anon";
GRANT ALL ON TABLE "public"."scale_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."scale_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."semantic_threads" TO "anon";
GRANT ALL ON TABLE "public"."semantic_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."semantic_threads" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_access" TO "anon";
GRANT ALL ON TABLE "public"."staff_access" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_access" TO "service_role";



GRANT ALL ON TABLE "public"."staff_reflections" TO "anon";
GRANT ALL ON TABLE "public"."staff_reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_reflections" TO "service_role";



GRANT ALL ON TABLE "public"."swl_breadcrumb_queue" TO "anon";
GRANT ALL ON TABLE "public"."swl_breadcrumb_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."swl_breadcrumb_queue" TO "service_role";



GRANT ALL ON TABLE "public"."swl_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."swl_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."swl_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."twilio_configs" TO "anon";
GRANT ALL ON TABLE "public"."twilio_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."twilio_configs" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_security" TO "anon";
GRANT ALL ON TABLE "public"."user_security" TO "authenticated";
GRANT ALL ON TABLE "public"."user_security" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."vendor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_change AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_staff_from_auth();


  create policy "anon_read_receipts"
  on "storage"."objects"
  as permissive
  for select
  to anon
using ((bucket_id = 'receipts'::text));



  create policy "anon_upload_receipts"
  on "storage"."objects"
  as permissive
  for insert
  to anon
with check ((bucket_id = 'receipts'::text));



