import { ChildProfile, DisplayScheduleItem, GapAlert, ScheduleItem } from "@/lib/types";

const DAY_END_TIME = "18:00";

export function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  if (!remainder) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

export function itemSort(a: ScheduleItem, b: ScheduleItem) {
  return toMinutes(a.start) - toMinutes(b.start);
}

export function getTodayIndex() {
  const rawDay = new Date().getDay();
  return rawDay === 0 ? 6 : rawDay - 1;
}

export function buildScheduleWithCareCoverage(
  child: ChildProfile,
  items: ScheduleItem[],
  dayOfWeek: number,
) {
  const dailyItems = items
    .filter((item) => item.childId === child.id && item.dayOfWeek === dayOfWeek)
    .sort(itemSort);

  const coverageItems: DisplayScheduleItem[] = [];
  let cursorTime = child.defaultDismissal;

  for (const item of dailyItems) {
    if (toMinutes(item.start) > toMinutes(cursorTime)) {
      coverageItems.push({
        id: `auto-care-${child.id}-${dayOfWeek}-${cursorTime}-${item.start}`,
        childId: child.id,
        dayOfWeek,
        title: "돌봄",
        type: "care",
        start: cursorTime,
        end: item.start,
        location: "자동 채움",
        pickupOwner: "TBD",
        notes: "명시된 일정 외 시간을 자동으로 돌봄으로 표시합니다.",
        packingList: "",
        isAutoCare: true,
      });
    }

    coverageItems.push(item);
    cursorTime = item.end;
  }

  if (!dailyItems.length || toMinutes(cursorTime) < toMinutes(DAY_END_TIME)) {
    coverageItems.push({
      id: `auto-care-${child.id}-${dayOfWeek}-${cursorTime}-${DAY_END_TIME}`,
      childId: child.id,
      dayOfWeek,
      title: "돌봄",
      type: "care",
      start: cursorTime,
      end: DAY_END_TIME,
      location: "자동 채움",
      pickupOwner: "TBD",
      notes: "명시된 일정 외 시간을 자동으로 돌봄으로 표시합니다.",
      packingList: "",
      isAutoCare: true,
    });
  }

  return coverageItems.sort(itemSort);
}

export function buildGapAlerts(
  children: ChildProfile[],
  items: ScheduleItem[],
  dayOfWeek: number,
) {
  return children.flatMap((child) => {
    const dailyItems = items
      .filter((item) => item.childId === child.id && item.dayOfWeek === dayOfWeek)
      .sort(itemSort);

    const alerts: GapAlert[] = [];

    for (let index = 0; index < dailyItems.length; index += 1) {
      const current = dailyItems[index];
      const next = dailyItems[index + 1];

      if (current.pickupOwner === "TBD") {
        const handoffEnd = next?.start ?? DAY_END_TIME;

        alerts.push({
          childName: child.name,
          start: current.end,
          end: handoffEnd,
          durationMinutes: Math.max(
            0,
            toMinutes(handoffEnd) - toMinutes(current.end),
          ),
          reason: `${current.title} pickup is still unassigned.`,
        });
      }

      if (!next) {
        continue;
      }
    }

    return alerts;
  });
}
