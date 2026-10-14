-- =============================================================================
-- HAIR UP — 어드민 계정 역할 (admin_users)
-- auth.users 와 artists 를 잇는다. 역할은 이 테이블에서만 읽는다.
-- Supabase SQL Editor 에 전체 붙여넣고 Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role        text NOT NULL,
  artist_id   text REFERENCES public.artists (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'designer')),
  CONSTRAINT admin_users_designer_artist_id_check CHECK (
    role <> 'designer' OR artist_id IS NOT NULL
  )
);

COMMENT ON TABLE public.admin_users IS '어드민 로그인 계정의 역할. owner 또는 designer. designer 는 artists.id 필수';

CREATE OR REPLACE FUNCTION public.set_admin_users_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_admin_users_updated_at();

-- 공개 정책 없음 → anon/authenticated 차단, 서버 API(service_role)만 접근
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 이 SQL 을 실행하는 시점에 auth.users 에 있는 계정을 owner 로 넣는다.
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'owner'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
