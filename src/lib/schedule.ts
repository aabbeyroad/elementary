import { ChildProfile, GapAlert, ScheduleItem } from "@/lib/types";

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

    if (!dailyItems.length) {
      alerts.push({
        childName: child.name,
        start: child.defaultDismissal,
        end: DAY_END_TIME,
        durationMinutes: toMinutes(DAY_END_TIME) - toMinutes(child.defaultDismissal),
        reason: "No after-school plan exists yet.",
      });

      return alerts;
    }

    const firstItem = dailyItems[0];
    const dismissalGap = toMinutes(firstItem.start) - toMinutes(child.defaultDismissal);

    if (dismissalGap > 0) {
      alerts.push({
        childName: child.name,
        start: child.defaultDismissal,
        end: firstItem.start,
        durationMinutes: dismissalGap,
        reason: `No coverage is planned between dismissal and ${firstItem.title}.`,
      });
    }

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

      const gap = toMinutes(next.start) - toMinutes(current.end);

      if (gap >= 20 && current.pickupOwner !== "TBD") {
        alerts.push({
          childName: child.name,
          start: current.end,
          end: next.start,
          durationMinutes: gap,
          reason: `Gap between ${current.title} and ${next.title}.`,
        });
      }
    }

    const lastItem = dailyItems[dailyItems.length - 1];
    const endOfDayGap = toMinutes(DAY_END_TIME) - toMinutes(lastItem.end);

    if (endOfDayGap > 0 && lastItem.pickupOwner !== "TBD") {
      alerts.push({
        childName: child.name,
        start: lastItem.end,
        end: DAY_END_TIME,
        durationMinutes: endOfDayGap,
        reason: "No coverage is planned after the final scheduled item.",
      });
    }

    return alerts;
  });
}
