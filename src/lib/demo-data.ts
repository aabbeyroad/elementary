import { ChildProfile, ParentRole, ScheduleItem } from "@/lib/types";

export const STORAGE_KEY = "elementary-household-v2";

export const PARENT_OPTIONS: ParentRole[] = [
  "Mom",
  "Dad",
  "Grandma",
  "Academy Bus",
  "TBD",
];

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const sampleChildren: ChildProfile[] = [
  {
    id: "child-1",
    name: "Min",
    grade: "1st grade",
    school: "Haedam Elementary",
    defaultDismissal: "13:10",
  },
];

export const sampleSchedule: ScheduleItem[] = [
  {
    id: "item-1",
    childId: "child-1",
    dayOfWeek: 0,
    title: "School",
    type: "school",
    start: "08:20",
    end: "13:10",
    location: "Haedam Elementary",
    pickupOwner: "Mom",
    notes: "Lunch card in the front pocket",
    packingList: "Homework folder, water bottle",
  },
  {
    id: "item-2",
    childId: "child-1",
    dayOfWeek: 0,
    title: "Math Academy",
    type: "academy",
    start: "15:00",
    end: "16:30",
    location: "Dream Math",
    pickupOwner: "Dad",
    notes: "Dad drops off after work handoff",
    packingList: "Workbook, pencil case",
  },
  {
    id: "item-3",
    childId: "child-1",
    dayOfWeek: 1,
    title: "School",
    type: "school",
    start: "08:20",
    end: "13:10",
    location: "Haedam Elementary",
    pickupOwner: "TBD",
    notes: "Need pickup plan confirmed by 11am",
    packingList: "Reading diary",
  },
  {
    id: "item-4",
    childId: "child-1",
    dayOfWeek: 1,
    title: "Taekwondo",
    type: "activity",
    start: "16:00",
    end: "17:00",
    location: "Blue Tiger Studio",
    pickupOwner: "Academy Bus",
    notes: "Uniform stays in cubby",
    packingList: "Uniform",
  },
  {
    id: "item-5",
    childId: "child-1",
    dayOfWeek: 2,
    title: "School",
    type: "school",
    start: "08:20",
    end: "14:00",
    location: "Haedam Elementary",
    pickupOwner: "Dad",
    notes: "After-school reading class ends at 2pm",
    packingList: "Library book",
  },
  {
    id: "item-6",
    childId: "child-1",
    dayOfWeek: 2,
    title: "Grandma Care",
    type: "care",
    start: "14:30",
    end: "18:00",
    location: "Grandma's home",
    pickupOwner: "Grandma",
    notes: "Snack bag in backpack",
    packingList: "Indoor socks",
  },
];
