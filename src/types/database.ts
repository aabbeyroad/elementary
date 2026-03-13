// 돌봄돌봄 데이터베이스 타입 정의

export type ScheduleCategory = 'school' | 'academy' | 'pickup' | 'dropoff' | 'other' | 'custom';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  invite_expires_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  color: string;
  avatar_url: string | null;
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  birth_date: string | null;
  school_name: string | null;
  grade: number | null;
  class_number: number | null;
  care_window_start: string; // TIME 형식 "HH:MM"
  care_window_end: string;   // TIME 형식 "HH:MM"
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  category: ScheduleCategory;
  custom_category_id: string | null;
  location: string | null;
  start_time: string; // TIME 형식 "HH:MM"
  end_time: string;   // TIME 형식 "HH:MM"
  day_of_week: number | null; // 0=일, 1=월, ..., 6=토
  specific_date: string | null; // "YYYY-MM-DD"
  is_recurring: boolean;
  assigned_parent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleOverride {
  id: string;
  schedule_id: string;
  override_date: string;
  is_cancelled: boolean;
  override_start_time: string | null;
  override_end_time: string | null;
  override_assigned_parent_id: string | null;
  override_notes: string | null;
  created_at: string;
}

export interface Supply {
  id: string;
  family_id: string;
  child_id: string;
  schedule_id: string | null;
  title: string;
  target_date: string | null;
  day_of_week: number | null;
  is_recurring: boolean;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomCategory {
  id: string;
  family_id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

// 클라이언트에서 사용하는 계산된 타입
export interface ResolvedSchedule extends Omit<Schedule, 'day_of_week' | 'specific_date' | 'is_recurring'> {
  date: string; // 실제 날짜
  is_overridden: boolean;
  is_cancelled: boolean;
  assigned_parent?: Profile;
  child?: Child;
}

export interface CareGap {
  child_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}
