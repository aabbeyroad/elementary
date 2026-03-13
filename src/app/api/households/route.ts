import { NextRequest, NextResponse } from "next/server";
import { createHousehold, loadHouseholdByAccessCode } from "@/lib/server/household-repo";
import { hasSupabaseConfig } from "@/lib/server/supabase-admin";
import { normalizeAccessCode, validateHouseholdCreate } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const checkOnly = request.nextUrl.searchParams.get("check");

  if (checkOnly === "1") {
    return NextResponse.json({ available: hasSupabaseConfig() });
  }

  return NextResponse.json({ error: "Unsupported request." }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as
    | {
        action: "create";
        householdName: string;
        ownerName: string;
      }
    | {
        action: "join";
        accessCode: string;
      };

  try {
    if (body.action === "create") {
      const household = await createHousehold(validateHouseholdCreate(body));
      return NextResponse.json({ household });
    }

    const accessCode = normalizeAccessCode(body.accessCode);

    if (!accessCode) {
      return NextResponse.json({ error: "Household code is required." }, { status: 400 });
    }

    const household = await loadHouseholdByAccessCode(accessCode);

    if (!household) {
      return NextResponse.json(
        { error: "No household matched that code." },
        { status: 404 },
      );
    }

    return NextResponse.json({ household });
  } catch (error) {
    const status =
      error instanceof Error &&
      (error.message.includes("required") || error.message.includes("matched"))
        ? 400
        : 500;

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not complete household action.",
      },
      { status },
    );
  }
}
