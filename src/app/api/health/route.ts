import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/server/supabase-admin";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "elementary-care-planner",
    sharedStorageConfigured: hasSupabaseConfig(),
    timestamp: new Date().toISOString(),
  });
}
