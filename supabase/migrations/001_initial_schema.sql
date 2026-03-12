-- 돌봄돌봄 초기 데이터베이스 스키마
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. 가족 테이블
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  invite_expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 프로필 테이블 (auth.users 확장)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '부모',
  color TEXT NOT NULL DEFAULT '#6366f1',
  avatar_url TEXT,
  family_id UUID REFERENCES families(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 자녀 테이블
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  school_name TEXT,
  grade INTEGER CHECK (grade >= 1 AND grade <= 6),
  class_number INTEGER,
  care_window_start TIME NOT NULL DEFAULT '13:00',
  care_window_end TIME NOT NULL DEFAULT '18:00',
  color TEXT NOT NULL DEFAULT '#10b981',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 사용자 정의 카테고리
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 일정 테이블
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  custom_category_id UUID REFERENCES custom_categories(id) ON DELETE SET NULL,
  location TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  is_recurring BOOLEAN DEFAULT true,
  assigned_parent_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT schedule_type_check CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND specific_date IS NULL)
    OR (is_recurring = false AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- 6. 일정 예외 처리 테이블
CREATE TABLE schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_cancelled BOOLEAN DEFAULT false,
  override_start_time TIME,
  override_end_time TIME,
  override_assigned_parent_id UUID REFERENCES profiles(id),
  override_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, override_date)
);

-- 7. 준비물 테이블
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_date DATE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_recurring BOOLEAN DEFAULT false,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_profiles_family ON profiles(family_id);
CREATE INDEX idx_children_family ON children(family_id);
CREATE INDEX idx_schedules_family_day ON schedules(family_id, day_of_week) WHERE is_recurring = true;
CREATE INDEX idx_schedules_family_date ON schedules(family_id, specific_date) WHERE is_recurring = false;
CREATE INDEX idx_schedules_child ON schedules(child_id);
CREATE INDEX idx_supplies_family_date ON supplies(family_id, target_date);
CREATE INDEX idx_supplies_family_day ON supplies(family_id, day_of_week) WHERE is_recurring = true;
CREATE INDEX idx_custom_categories_family ON custom_categories(family_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

-- 프로필 RLS 정책
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can view family members" ON profiles
  FOR SELECT USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 가족 RLS 정책
CREATE POLICY "Users can view own family" ON families
  FOR SELECT USING (id = (SELECT family_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert family" ON families
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own family" ON families
  FOR UPDATE USING (id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 자녀 RLS 정책 (같은 가족만 접근)
CREATE POLICY "Users can manage own family children" ON children
  FOR ALL USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 사용자 정의 카테고리 RLS
CREATE POLICY "Users can manage own family categories" ON custom_categories
  FOR ALL USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 일정 RLS 정책
CREATE POLICY "Users can manage own family schedules" ON schedules
  FOR ALL USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 일정 예외 RLS 정책
CREATE POLICY "Users can manage own family schedule overrides" ON schedule_overrides
  FOR ALL USING (
    schedule_id IN (
      SELECT id FROM schedules WHERE family_id = (SELECT family_id FROM profiles WHERE id = auth.uid())
    )
  );

-- 준비물 RLS 정책
CREATE POLICY "Users can manage own family supplies" ON supplies
  FOR ALL USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- 신규 유저 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '부모'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON supplies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
