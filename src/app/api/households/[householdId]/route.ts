import { NextRequest, NextResponse } from "next/server";
import { saveHouseholdSnapshot } from "@/lib/server/household-repo";
import { hasSupabaseConfig } from "@/lib/server/supabase-admin";
import { ChildProfile, ScheduleItem } from "@/lib/types";
import { validateChildren, validateSchedule } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ householdId: string }> },
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const { householdId } = await context.params;
  const body = (await request.json()) as {
    children: ChildProfile[];
    schedule: ScheduleItem[];
  };

  try {
    const children = validateChildren(body.children);
    const schedule = validateSchedule(body.schedule, new Set(children.map((child) => child.id)));
    const household = await saveHouseholdSnapshot({
      householdId,
      children,
      schedule,
    });

    return NextResponse.json({ household });
  } catch (error) {
    const status = error instanceof Error ? 400 : 500;

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save household changes.",
      },
      { status },
    );
  }
}
