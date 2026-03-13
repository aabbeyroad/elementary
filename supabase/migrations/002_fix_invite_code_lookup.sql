-- 초대코드로 가족을 찾는 RPC 함수
-- RLS를 우회하여 가족이 아직 없는 사용자도 초대코드로 검색 가능
-- SECURITY DEFINER로 실행하여 RLS 정책을 우회합니다

CREATE OR REPLACE FUNCTION find_family_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT, invite_code TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.invite_code, f.created_at
  FROM families f
  WHERE f.invite_code = code
    AND (f.invite_expires_at IS NULL OR f.invite_expires_at > now())
  LIMIT 1;
END;
$$;

-- 인증된 사용자만 호출 가능
REVOKE ALL ON FUNCTION find_family_by_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_family_by_invite_code(TEXT) TO authenticated;
