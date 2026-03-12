import "server-only";

import { sampleChildren, sampleSchedule } from "@/lib/demo-data";
import { ChildProfile, HouseholdBundle, ScheduleItem } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeAccessCode } from "@/lib/validation";

type HouseholdRow = {
  id: string;
  name: string;
  access_code: string;
  owner_name: string;
  updated_at: string;
};

type ChildRow = {
  id: string;
  household_id: string;
  name: string;
  grade: string;
  school: string;
  default_dismissal: string;
};

type ScheduleRow = {
  id: string;
  household_id: string;
  child_id: string;
  day_of_week: number;
  title: string;
  type: ScheduleItem["type"];
  start_time: string;
  end_time: string;
  location: string;
  pickup_owner: ScheduleItem["pickupOwner"];
  notes: string;
  packing_list: string;
};

function mapHouseholdBundle(
  household: HouseholdRow,
  children: ChildRow[],
  schedule: ScheduleRow[],
): HouseholdBundle {
  return {
    household: {
      id: household.id,
      name: household.name,
      accessCode: household.access_code,
      ownerName: household.owner_name,
      updatedAt: household.updated_at,
    },
    children: children.map((child) => ({
      id: child.id,
      name: child.name,
      grade: child.grade,
      school: child.school,
      defaultDismissal: child.default_dismissal,
    })),
    schedule: schedule.map((item) => ({
      id: item.id,
      childId: item.child_id,
      dayOfWeek: item.day_of_week,
      title: item.title,
      type: item.type,
      start: item.start_time,
      end: item.end_time,
      location: item.location,
      pickupOwner: item.pickup_owner,
      notes: item.notes,
      packingList: item.packing_list,
    })),
  };
}

function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * alphabet.length);
    return alphabet[index];
  }).join("");
}

async function generateUniqueAccessCode() {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const accessCode = generateAccessCode();
    const { data } = await supabase
      .from("households")
      .select("id")
      .eq("access_code", accessCode)
      .maybeSingle();

    if (!data) {
      return accessCode;
    }
  }

  throw new Error("Could not generate a unique household code.");
}

export async function loadHouseholdByAccessCode(accessCode: string) {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeAccessCode(accessCode);

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, access_code, owner_name, updated_at")
    .eq("access_code", normalized)
    .maybeSingle<HouseholdRow>();

  if (householdError) {
    throw householdError;
  }

  if (!household) {
    return null;
  }

  return loadHouseholdById(household.id);
}

export async function loadHouseholdById(householdId: string) {
  const supabase = getSupabaseAdmin();

  const [{ data: household, error: householdError }, { data: children, error: childrenError }, { data: schedule, error: scheduleError }] =
    await Promise.all([
      supabase
        .from("households")
        .select("id, name, access_code, owner_name, updated_at")
        .eq("id", householdId)
        .single<HouseholdRow>(),
      supabase
        .from("children")
        .select("id, household_id, name, grade, school, default_dismissal")
        .eq("household_id", householdId)
        .order("name")
        .returns<ChildRow[]>(),
      supabase
        .from("schedule_items")
        .select(
          "id, household_id, child_id, day_of_week, title, type, start_time, end_time, location, pickup_owner, notes, packing_list",
        )
        .eq("household_id", householdId)
        .order("day_of_week")
        .order("start_time")
        .returns<ScheduleRow[]>(),
    ]);

  if (householdError) {
    throw householdError;
  }

  if (childrenError) {
    throw childrenError;
  }

  if (scheduleError) {
    throw scheduleError;
  }

  return mapHouseholdBundle(household, children ?? [], schedule ?? []);
}

export async function createHousehold(input: {
  householdName: string;
  ownerName: string;
}) {
  const supabase = getSupabaseAdmin();
  const accessCode = await generateUniqueAccessCode();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: input.householdName.trim(),
      owner_name: input.ownerName.trim(),
      access_code: accessCode,
    })
    .select("id, name, access_code, owner_name, updated_at")
    .single<HouseholdRow>();

  if (householdError) {
    throw householdError;
  }

  const seededChildren = sampleChildren.map((child) => ({
    id: crypto.randomUUID(),
    household_id: household.id,
    name: child.name,
    grade: child.grade,
    school: child.school,
    default_dismissal: child.defaultDismissal,
  }));

  const sampleChildId = seededChildren[0]?.id;

  const seededSchedule = sampleSchedule.map((item) => ({
    id: crypto.randomUUID(),
    household_id: household.id,
    child_id: sampleChildId,
    day_of_week: item.dayOfWeek,
    title: item.title,
    type: item.type,
    start_time: item.start,
    end_time: item.end,
    location: item.location,
    pickup_owner: item.pickupOwner,
    notes: item.notes,
    packing_list: item.packingList,
  }));

  const [{ error: childError }, { error: scheduleError }] = await Promise.all([
    supabase.from("children").insert(seededChildren),
    supabase.from("schedule_items").insert(seededSchedule),
  ]);

  if (childError) {
    throw childError;
  }

  if (scheduleError) {
    throw scheduleError;
  }

  return loadHouseholdById(household.id);
}

export async function saveHouseholdSnapshot(input: {
  householdId: string;
  children: ChildProfile[];
  schedule: ScheduleItem[];
}) {
  const supabase = getSupabaseAdmin();

  // We replace the whole household snapshot so both parents always see the
  // same source of truth, even before full multi-user conflict handling exists.
  const scheduleRows = input.schedule.map((item) => ({
    id: item.id,
    household_id: input.householdId,
    child_id: item.childId,
    day_of_week: item.dayOfWeek,
    title: item.title,
    type: item.type,
    start_time: item.start,
    end_time: item.end,
    location: item.location,
    pickup_owner: item.pickupOwner,
    notes: item.notes,
    packing_list: item.packingList,
  }));

  const childRows = input.children.map((child) => ({
    id: child.id,
    household_id: input.householdId,
    name: child.name,
    grade: child.grade,
    school: child.school,
    default_dismissal: child.defaultDismissal,
  }));

  const { error: deleteScheduleError } = await supabase
    .from("schedule_items")
    .delete()
    .eq("household_id", input.householdId);

  if (deleteScheduleError) {
    throw deleteScheduleError;
  }

  const { error: deleteChildrenError } = await supabase
    .from("children")
    .delete()
    .eq("household_id", input.householdId);

  if (deleteChildrenError) {
    throw deleteChildrenError;
  }

  if (childRows.length) {
    const { error: childInsertError } = await supabase.from("children").insert(childRows);

    if (childInsertError) {
      throw childInsertError;
    }
  }

  if (scheduleRows.length) {
    const { error: scheduleInsertError } = await supabase
      .from("schedule_items")
      .insert(scheduleRows);

    if (scheduleInsertError) {
      throw scheduleInsertError;
    }
  }

  const { error: householdUpdateError } = await supabase
    .from("households")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.householdId);

  if (householdUpdateError) {
    throw householdUpdateError;
  }

  return loadHouseholdById(input.householdId);
}
