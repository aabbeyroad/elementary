import { ChildProfile, GapAlert, ScheduleItem } from "@/lib/types";

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
        end: "18:00",
        durationMinutes: toMinutes("18:00") - toMinutes(child.defaultDismissal),
        reason: "No after-school plan exists yet.",
      });

      return alerts;
    }

    // This checks the real handoff windows, because the stressful moment for
    // parents is usually the transition between two valid schedule blocks.
    for (let index = 0; index < dailyItems.length; index += 1) {
      const current = dailyItems[index];
      const next = dailyItems[index + 1];

      if (current.pickupOwner === "TBD") {
        alerts.push({
          childName: child.name,
          start: current.end,
          end: next?.start ?? "18:00",
          durationMinutes: Math.max(
            0,
            toMinutes(next?.start ?? "18:00") - toMinutes(current.end),
          ),
          reason: `${current.title} pickup is still unassigned.`,
        });
      }

      if (!next) {
        continue;
      }

      const gap = toMinutes(next.start) - toMinutes(current.end);

      if (gap >= 20) {
        alerts.push({
          childName: child.name,
          start: current.end,
          end: next.start,
          durationMinutes: gap,
          reason: `Gap between ${current.title} and ${next.title}.`,
        });
      }
    }

    return alerts;
  });
}
