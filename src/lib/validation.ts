import { ChildProfile, ScheduleItem } from "@/lib/types";

function cleanText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function validateHouseholdCreate(input: {
  householdName: string;
  ownerName: string;
}) {
  const householdName = cleanText(input.householdName, 80);
  const ownerName = cleanText(input.ownerName, 60);

  if (!householdName) {
    throw new Error("Household name is required.");
  }

  if (!ownerName) {
    throw new Error("Owner name is required.");
  }

  return { householdName, ownerName };
}

export function validateChildren(children: ChildProfile[]) {
  if (!children.length) {
    throw new Error("Add at least one child before syncing.");
  }

  return children.map((child) => {
    const name = cleanText(child.name, 60);
    const grade = cleanText(child.grade, 30);
    const school = cleanText(child.school, 80);
    const defaultDismissal = child.defaultDismissal.slice(0, 5);

    if (!child.id || !name || !grade || !school || !defaultDismissal) {
      throw new Error("Each child needs a name, grade, school, and dismissal time.");
    }

    return {
      ...child,
      name,
      grade,
      school,
      defaultDismissal,
    };
  });
}

export function validateSchedule(schedule: ScheduleItem[], childIds: Set<string>) {
  return schedule.map((item) => {
    const title = cleanText(item.title, 80);
    const location = cleanText(item.location, 80);
    const notes = cleanText(item.notes, 240);
    const packingList = cleanText(item.packingList, 240);

    if (!item.id || !childIds.has(item.childId)) {
      throw new Error("Every schedule item must belong to an existing child.");
    }

    if (!title || !location) {
      throw new Error("Every schedule item needs a title and location.");
    }

    if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
      throw new Error("Weekday must be between Monday and Sunday.");
    }

    return {
      ...item,
      title,
      location,
      notes,
      packingList,
      start: item.start.slice(0, 5),
      end: item.end.slice(0, 5),
    };
  });
}
