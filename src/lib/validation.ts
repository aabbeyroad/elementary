import { ChildProfile, ScheduleItem } from "@/lib/types";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function cleanText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function isValidTimeValue(value: string) {
  return TIME_PATTERN.test(value);
}

export function toTimeMinutes(value: string) {
  if (!isValidTimeValue(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

export function hasValidTimeRange(start: string, end: string) {
  const startMinutes = toTimeMinutes(start);
  const endMinutes = toTimeMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return startMinutes < endMinutes;
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

    if (!isValidTimeValue(defaultDismissal)) {
      throw new Error("Each child needs a valid dismissal time.");
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
  const normalizedSchedule = schedule.map((item) => {
    const title = cleanText(item.title, 80);
    const location = cleanText(item.location, 80);
    const notes = cleanText(item.notes, 240);
    const packingList = cleanText(item.packingList, 240);
    const start = item.start.slice(0, 5);
    const end = item.end.slice(0, 5);

    if (!item.id || !childIds.has(item.childId)) {
      throw new Error("Every schedule item must belong to an existing child.");
    }

    if (!title || !location) {
      throw new Error("Every schedule item needs a title and location.");
    }

    if (!Number.isInteger(item.dayOfWeek) || item.dayOfWeek < 0 || item.dayOfWeek > 6) {
      throw new Error("Weekday must be between Monday and Sunday.");
    }

    if (!hasValidTimeRange(start, end)) {
      throw new Error("Every schedule item needs a valid start time before its end time.");
    }

    return {
      ...item,
      title,
      location,
      notes,
      packingList,
      start,
      end,
    };
  });

  const groupedByChildAndDay = new Map<string, ScheduleItem[]>();

  for (const item of normalizedSchedule) {
    const key = `${item.childId}-${item.dayOfWeek}`;
    const group = groupedByChildAndDay.get(key) ?? [];
    group.push(item);
    groupedByChildAndDay.set(key, group);
  }

  for (const items of groupedByChildAndDay.values()) {
    const sortedItems = [...items].sort((left, right) => {
      const leftMinutes = toTimeMinutes(left.start) ?? 0;
      const rightMinutes = toTimeMinutes(right.start) ?? 0;

      return leftMinutes - rightMinutes;
    });

    for (let index = 0; index < sortedItems.length - 1; index += 1) {
      const current = sortedItems[index];
      const next = sortedItems[index + 1];
      const currentEnd = toTimeMinutes(current.end) ?? 0;
      const nextStart = toTimeMinutes(next.start) ?? 0;

      if (currentEnd > nextStart) {
        throw new Error("Schedule items for the same child cannot overlap.");
      }
    }
  }

  return normalizedSchedule;
}
