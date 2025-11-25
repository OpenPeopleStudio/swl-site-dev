import { NextResponse } from "next/server";
import { ensureTrustedDevice, requirePosStaff, PosHttpError } from "@/lib/staff/posServer";

type MenuCategory = {
  id: string;
  label: string;
  color: string | null;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    tags: string[];
    group_id: string | null;
    modifiers: MenuModifier[];
  }>;
};

type MenuModifier = {
  id: string;
  label: string;
  default_applied: boolean;
  extra_cost: number;
};

export async function GET(request: Request) {
  try {
    const context = await requirePosStaff();
    await ensureTrustedDevice(context.supabase, request.headers.get("x-pos-device"));

    const { supabase } = context;

    const { data: categories, error: categoryError } = await supabase
      .from("pos_menu_categories")
      .select("id, label, color, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (categoryError) {
      console.error("Menu categories fetch failed", categoryError);
      return NextResponse.json({ error: "Unable to load menu categories." }, { status: 500 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("pos_menu_items")
      .select("id, category_id, group_id, name, description, price, tags, display_order")
      .eq("available", true)
      .order("display_order", { ascending: true });

    if (itemsError) {
      console.error("Menu items fetch failed", itemsError);
      return NextResponse.json({ error: "Unable to load menu items." }, { status: 500 });
    }

    const groupIds = Array.from(
      new Set((items ?? []).map((item) => item.group_id).filter(Boolean) as string[]),
    );

    type RawModifier = {
      id: string;
      group_id: string;
      label: string;
      default_applied: boolean;
      extra_cost: number;
    };

    const modifierQuery = groupIds.length
      ? supabase
          .from("pos_modifiers")
          .select("id, group_id, label, default_applied, extra_cost")
          .in("group_id", groupIds)
      : Promise.resolve<{ data: RawModifier[]; error: null }>({ data: [], error: null });

    const { data: modifiers, error: modifierError } = (await modifierQuery) as {
      data: RawModifier[];
      error: unknown;
    };

    if (modifierError) {
      console.error("Modifiers fetch failed", modifierError);
      return NextResponse.json({ error: "Unable to load modifiers." }, { status: 500 });
    }

    const modifiersByGroup = new Map<string, MenuModifier[]>();
    (modifiers ?? []).forEach((modifier) => {
      const group = modifiersByGroup.get(modifier.group_id) ?? [];
      group.push({
        id: modifier.id,
        label: modifier.label,
        default_applied: modifier.default_applied ?? false,
        extra_cost: Number(modifier.extra_cost) || 0,
      });
      modifiersByGroup.set(modifier.group_id, group);
    });

    const itemsByCategory = new Map<string, MenuCategory["items"]>();
    (items ?? []).forEach((item) => {
      const bucket = itemsByCategory.get(item.category_id) ?? [];
      bucket.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        tags: item.tags ?? [],
        group_id: item.group_id,
        modifiers: item.group_id ? modifiersByGroup.get(item.group_id) ?? [] : [],
      });
      itemsByCategory.set(item.category_id, bucket);
    });

    const payload: MenuCategory[] = (categories ?? []).map((category) => ({
      id: category.id,
      label: category.label,
      color: category.color,
      items: itemsByCategory.get(category.id) ?? [],
    }));

    return NextResponse.json({ categories: payload });
  } catch (error) {
    if (error instanceof PosHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POS menu endpoint error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

