export type ParentRole = "Mom" | "Dad" | "Grandma" | "Academy Bus" | "TBD";
export type ScheduleType = "school" | "academy" | "care" | "activity" | "pickup";

export type ChildProfile = {
  id: string;
  name: string;
  grade: string;
  school: string;
  defaultDismissal: string;
};

export type ScheduleItem = {
  id: string;
  childId: string;
  dayOfWeek: number;
  title: string;
  type: ScheduleType;
  start: string;
  end: string;
  location: string;
  pickupOwner: ParentRole;
  notes: string;
  packingList: string;
};

export type GapAlert = {
  childName: string;
  start: string;
  end: string;
  durationMinutes: number;
  reason: string;
};

export type HouseholdSummary = {
  id: string;
  name: string;
  accessCode: string;
  ownerName: string;
  updatedAt: string;
};

export type HouseholdBundle = {
  household: HouseholdSummary;
  children: ChildProfile[];
  schedule: ScheduleItem[];
};
