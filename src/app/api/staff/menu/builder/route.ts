import { NextResponse } from "next/server";
import { MENU_BUILDER_SAMPLE } from "@/data/menuBuilderSample";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(MENU_BUILDER_SAMPLE);
}


