# Elementary — Claude Code 프로젝트 가이드

## 프로젝트 개요

Elementary는 Next.js 15와 Supabase로 구축된 한국 가족 일정 관리 웹앱입니다. 가정에서 자녀의 일정을 관리하고, 돌봄 공백을 감지하며, 부모 간 픽업 책임을 조율하는 데 도움을 줍니다.

## 기술 스택

- **프레임워크**: Next.js 15 (App Router, Turbopack)
- **언어**: TypeScript (strict)
- **스타일링**: Tailwind CSS v4 + Apple 스타일 커스텀 디자인 시스템
- **백엔드**: Supabase (Postgres, Auth, Realtime)
- **UI 컴포넌트**: `src/components/ui/` 커스텀 컴포넌트 라이브러리
- **유효성 검사**: Zod
- **날짜 처리**: date-fns (한국어 로케일)

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

## 환경 설정

`.env.local.example`을 `.env.local`로 복사한 후 다음 항목을 입력합니다:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon 키
- `NEXT_PUBLIC_APP_URL` — 앱 URL (기본값: http://localhost:3000)
- `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` — 네이버 지역 검색 API

## 디렉토리 구조

```
src/
  app/
    (app)/           # 인증된 앱 라우트 (AppShell 레이아웃)
      dashboard/     # 일간 일정 뷰 (기본 랜딩 페이지)
      schedule/      # 주간 + 월간 일정 뷰
      children/      # 자녀 프로필 관리
      supplies/      # 학용품 관리
      settings/      # 가족 설정
      onboarding/    # 최초 가족 설정
    api/
      households/    # 가족 데이터 CRUD
      naver/         # 네이버 지역 검색 프록시
    auth/callback/   # Supabase OAuth 콜백
    login/           # 로그인 / 이메일 인증
  components/
    dashboard/       # DashboardContent (일간 뷰 진입점)
    layout/          # AppShell, BottomNav, AppSessionProvider
    schedule/        # DailyView, WeeklyViewPage, MonthlyViewPage, ScheduleForm, DateNavigator
    ui/              # 디자인 시스템: Button, Card, Input, Select, PageHeader 등
  hooks/
    useSchedules.ts      # 일정 + 자녀 + 부모 데이터 조회 및 관리
    useRealtimeSync.ts   # Supabase 실시간 구독
    useModalDialog.ts    # 모달 상태 헬퍼
  lib/
    types.ts             # 핵심 도메인 타입 (ChildProfile, ScheduleItem 등)
    validation.ts        # 일정 유효성 검사 Zod 스키마
    utils/
      care-gaps.ts       # 돌봄 공백 감지 알고리즘
      schedule-helpers.ts  # resolveSchedulesForDate
    server/
      household-repo.ts  # 서버 사이드 가족 DB 쿼리
      supabase-admin.ts  # Supabase 관리자 클라이언트
    supabase/            # 클라이언트/서버/미들웨어 Supabase 헬퍼
  types/
    database.ts          # Supabase 생성 DB 타입 + 앱 타입
  middleware.ts          # Supabase 세션 갱신 미들웨어
supabase/                # Supabase 마이그레이션 및 설정
```

## 핵심 도메인 개념

- **Household (가족)**: 최상위 엔티티. 각 가족은 공유용 접속 코드가 있는 household를 하나 갖습니다.
- **ChildProfile (자녀 프로필)**: 학년, 학교, 기본 하교 시간을 가진 자녀.
- **ScheduleItem (일정 항목)**: 자녀의 반복 주간 일정 이벤트 (학교, 학원, 픽업 등).
- **Override (재정의)**: 반복 일정에 대한 특정 날짜의 일회성 변경.
- **ParentRole (부모 역할)**: `"Mom" | "Dad" | "Grandma" | "Academy Bus" | "TBD"` — 픽업 담당자.
- **Care gap (돌봄 공백)**: 자녀에게 성인이 배정되지 않은 시간대 (`care-gaps.ts`에서 감지).

## 아키텍처 노트

- `src/app/(app)/` 하위 모든 페이지는 인증 필요 — `AppShell` 레이아웃이 세션 검사를 처리합니다.
- `useSchedules`가 기본 데이터 훅 — 한 번의 호출로 일정, 재정의, 자녀, 부모 데이터를 가져옵니다.
- 일정 유효성 검사 (시간 겹침, 잘못된 범위)는 `src/lib/validation.ts`에 있으며 클라이언트/서버 양쪽에서 실행됩니다.
- 디자인 시스템 토큰은 글로벌 CSS에 정의되어 있으며 Apple 스타일 디자인 언어를 따릅니다 (`docs/design-system.md` 참고).

## 현재 개발 상태

전체 현황은 `docs/release-checklist.md` 참고. 남은 P0 블로커:
- `DashboardContent`와 메인 일정 페이지를 더 작은 뷰, 훅, 다이얼로그 컴포넌트로 분리.
- 돌봄 공백 로직, 파괴적 흐름, 동기화 프롬프트, 키보드 네비게이션에 대한 자동화 회귀 테스트 추가.

## 코딩 컨벤션

- `'use client'`는 필요한 곳에서만 사용 (인터랙티브 컴포넌트).
- 서버 컴포넌트는 `src/lib/server/` 헬퍼를 통해 데이터를 가져옵니다.
- 사용자에게 표시되는 한국어 문자열은 한국어 문자를 직접 사용합니다 (i18n 라이브러리 없음).
- 자식 컴포넌트에 전달되는 안정적인 참조에는 `useCallback`과 `useMemo` 사용 권장.
- 비긴급 상태 업데이트 (예: 날짜 네비게이션)에는 `startTransition` 사용.
- 새 UI는 raw Tailwind 값 대신 기존 디자인 토큰(`surface-card`, `page-shell` 등) 사용.

## Git 워크플로우

- `main` → 프로덕션 (Vercel)
- `claude/*` → Claude 작업 브랜치 (Vercel 프리뷰)
- `codex/*` → Codex 작업 브랜치 (Vercel 프리뷰)
- `main`에 직접 커밋하지 않습니다.
- 전체 워크플로우는 `docs/collaboration.md` 참고.
