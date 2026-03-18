# 돌봄돌봄 앱스토어 정식 출시 계획

## 현재 상태 요약

- **앱 유형**: Next.js 15 PWA (Progressive Web App)
- **백엔드**: Supabase (PostgreSQL + Auth + Realtime)
- **배포**: Vercel (웹)
- **버전**: 0.1.0 (베타)
- **네이티브 앱 코드**: 없음

## 출시 전략: Capacitor 기반 하이브리드 앱

기존 Next.js 웹앱을 **Capacitor**로 래핑하여 iOS/Android 네이티브 앱으로 변환합니다. 웹 코드를 그대로 재사용하면서 네이티브 기능(푸시 알림, 생체인증 등)을 점진적으로 추가할 수 있습니다.

### 왜 Capacitor인가?

| 대안 | 장점 | 단점 |
|------|------|------|
| **Capacitor** | 기존 Next.js 코드 100% 재사용, 네이티브 플러그인 생태계, Ionic 팀 유지보수 | 네이티브 성능 한계 |
| React Native 재작성 | 완전한 네이티브 UX | 전체 재작성 필요, 비용 과다 |
| TWA (Android only) | 최소 작업 | iOS 불가, 기능 제한 |
| App Clips / Instant Apps | 설치 없이 체험 | 전체 앱 대체 불가 |

---

## 마일스톤별 로드맵

### 마일스톤 1: 출시 사전 요건 충족 (4~6주)

기존 `frontend-release-plan.md`의 Phase 0~1 완료가 선행되어야 합니다.

#### 1-1. P0 잔여 이슈 해결
- [ ] 메인 페이지를 작은 뷰/훅/다이얼로그 단위로 분리
- [ ] 케어 갭 로직, 파괴적 흐름, 동기화, 키보드 탐색에 대한 자동화 테스트 추가

#### 1-2. 인증 체계 정비
- [ ] 이메일/비밀번호 로그인 안정화
- [ ] Apple 로그인 추가 (App Store 필수 — OAuth 로그인 제공 시 Apple 로그인도 필수)
- [ ] Kakao/Google OAuth 프로덕션 키 발급 및 리다이렉트 URI 설정
- [ ] 비밀번호 재설정, 이메일 인증 흐름 구현
- [ ] 회원 탈퇴 기능 구현 (App Store 심사 필수)

#### 1-3. 개인정보 및 법적 준비
- [ ] 개인정보 처리방침 작성 (한국어/영어)
- [ ] 이용약관 작성
- [ ] 앱 내 개인정보 처리방침 링크 배치
- [ ] COPPA/아동 데이터 관련 고지 (자녀 정보 수집 시 부모 동의 흐름)
- [ ] App Store 개인정보 설문(Privacy Nutrition Labels) 준비

#### 1-4. UX 품질 기준 달성
- [ ] 오프라인 상태 처리 (오프라인 배너, 큐잉된 변경사항 표시)
- [ ] 로딩/에러/빈 상태 전체 화면에 일관되게 적용
- [ ] 한국어 로컬라이제이션 완성도 검증 (영어 혼용 제거)
- [ ] 접근성 (VoiceOver/TalkBack) 기본 지원 확인

---

### 마일스톤 2: Capacitor 통합 및 네이티브 빌드 (2~3주)

#### 2-1. Capacitor 프로젝트 설정
- [ ] `@capacitor/core`, `@capacitor/cli` 설치
- [ ] `capacitor.config.ts` 생성 (앱 ID: `com.dolbomdolbom.app`)
- [ ] `npx cap init` 실행
- [ ] Next.js 정적 빌드 출력(`out/`)을 Capacitor 웹 디렉토리로 지정
- [ ] `next.config.ts`에 `output: 'export'` 설정 (정적 내보내기)

#### 2-2. iOS 프로젝트 구성
- [ ] `npx cap add ios`
- [ ] Xcode에서 Bundle Identifier 설정: `com.dolbomdolbom.app`
- [ ] 최소 배포 타겟: iOS 16.0
- [ ] App Icons 생성 (1024x1024 원본 → 전체 사이즈 세트)
- [ ] Launch Screen 스토리보드 구성
- [ ] Info.plist 권한 설명 추가 (필요 시: 카메라, 위치, 알림)
- [ ] ATS(App Transport Security) 설정 확인

#### 2-3. Android 프로젝트 구성
- [ ] `npx cap add android`
- [ ] `applicationId` 설정: `com.dolbomdolbom.app`
- [ ] 최소 SDK: API 26 (Android 8.0)
- [ ] Adaptive Icon 생성
- [ ] 서명 키스토어 생성 및 보관

#### 2-4. 네이티브 플러그인 통합
- [ ] `@capacitor/splash-screen` — 스플래시 화면
- [ ] `@capacitor/status-bar` — 상태바 스타일링
- [ ] `@capacitor/keyboard` — 키보드 동작 최적화
- [ ] `@capacitor/push-notifications` — 푸시 알림 (일정 리마인더)
- [ ] `@capacitor/app` — 앱 라이프사이클 (백그라운드/포그라운드)
- [ ] 딥링크 설정 (가정 초대 코드 공유용)

#### 2-5. 빌드 파이프라인 구성
- [ ] `package.json`에 빌드 스크립트 추가:
  ```
  "build:mobile": "next build && npx cap sync"
  "build:ios": "npm run build:mobile && npx cap open ios"
  "build:android": "npm run build:mobile && npx cap open android"
  ```
- [ ] CI에서 iOS/Android 빌드 자동화 (GitHub Actions + Fastlane)

---

### 마일스톤 3: 스토어 등록 준비 (1~2주)

#### 3-1. Apple 개발자 계정
- [ ] Apple Developer Program 등록 (연간 $99)
- [ ] 개인 또는 조직 계정 선택 (조직 시 D-U-N-S 번호 필요)
- [ ] App Store Connect에서 앱 등록
- [ ] 인증서 및 프로비저닝 프로파일 생성

#### 3-2. Google Play 계정
- [ ] Google Play Console 등록 (일회성 $25)
- [ ] 개발자 프로필 설정
- [ ] Google Play Console에서 앱 등록

#### 3-3. 스토어 메타데이터 작성

**App Store (iOS)**:
- [ ] 앱 이름: 돌봄돌봄 - 자녀 돌봄 일정 관리
- [ ] 부제목: 맞벌이 부모를 위한 스마트 돌봄 스케줄러
- [ ] 키워드: 육아, 돌봄, 일정관리, 맞벌이, 자녀, 스케줄, 학원, 하원, 픽업
- [ ] 설명문 (4000자 이내, 한국어)
- [ ] 프로모션 텍스트 (170자)
- [ ] 스크린샷: iPhone 6.7" (1290×2796), 6.5" (1284×2778), iPad 12.9"
- [ ] 앱 미리보기 영상 (선택, 15~30초)
- [ ] 카테고리: 라이프스타일 (주), 생산성 (부)
- [ ] 연령 등급: 4+ (자녀 정보 수집에 대한 설문 주의)

**Google Play (Android)**:
- [ ] 앱 제목 (30자): 돌봄돌봄 - 돌봄 일정 관리
- [ ] 간단한 설명 (80자)
- [ ] 자세한 설명 (4000자)
- [ ] 스크린샷: 최소 2장, 권장 8장 (16:9 또는 9:16)
- [ ] 그래픽 이미지 (1024×500)
- [ ] 카테고리: 육아
- [ ] 콘텐츠 등급 설문지 작성
- [ ] 데이터 안전 섹션 작성

#### 3-4. 앱 아이콘 및 에셋 제작
- [ ] 앱 아이콘 디자인 (1024×1024 원본)
  - iOS: 둥근 모서리 자동 적용 — 정사각형으로 제출
  - Android: Adaptive Icon (foreground + background 레이어)
- [ ] 피처 그래픽 (Google Play 1024×500)
- [ ] 스크린샷 촬영 (실제 디바이스 또는 시뮬레이터)

---

### 마일스톤 4: 테스트 및 QA (2~3주)

#### 4-1. 내부 테스트
- [ ] iOS: TestFlight 내부 테스트 (팀원 25명까지)
- [ ] Android: 내부 테스트 트랙 배포
- [ ] 핵심 사용자 여정 수동 테스트:
  - 회원가입 → 가정 생성 → 자녀 등록 → 일정 추가 → 동기화
  - 가정 참여 → 공유 일정 확인 → 돌봄 갭 확인
  - 오프라인 작업 → 재연결 시 동기화
  - 회원 탈퇴 및 데이터 삭제

#### 4-2. 외부 베타 테스트
- [ ] iOS: TestFlight 외부 테스트 (최대 10,000명)
- [ ] Android: 비공개/공개 테스트 트랙
- [ ] 대상: 맞벌이 부모 10~30명 모집
- [ ] 피드백 수집 채널 구축 (인앱 피드백 또는 Google Form)
- [ ] 크래시 리포팅 설정 (Sentry 또는 Firebase Crashlytics)

#### 4-3. 성능 및 품질 검증
- [ ] Lighthouse 점수: Performance ≥ 90, Accessibility ≥ 95
- [ ] 앱 시작 시간 < 3초 (cold start)
- [ ] 메모리 누수 확인 (장시간 사용 시나리오)
- [ ] 다양한 디바이스 테스트: iPhone SE ~ iPhone 15 Pro Max, 갤럭시 S/A 시리즈
- [ ] iOS/Android 버전별 호환성 확인

#### 4-4. App Store 심사 대비 체크리스트
- [ ] Apple 심사 가이드라인 준수 확인:
  - 4.2: 최소 기능 요건 (웹뷰 래핑만으로는 거절 위험 → 네이티브 기능 1개 이상 필수)
  - 5.1.1: 데이터 수집 및 저장 관련 동의
  - 5.1.2: 데이터 사용 및 공유 정책
  - 3.1.1: 인앱 결제 정책 (현재 무료이므로 해당 없음)
  - 2.1: 앱 완성도 — 크래시, placeholder 콘텐츠 없어야 함
- [ ] Google Play 정책 준수 확인:
  - 가족 정책 (자녀 데이터 수집 시)
  - 데이터 안전 섹션 정확성

---

### 마일스톤 5: 정식 출시 (1주)

#### 5-1. 최종 빌드 및 제출
- [ ] 버전 번호 확정: `1.0.0` (Build 1)
- [ ] 프로덕션 환경 변수 최종 점검
- [ ] iOS: Archive → App Store Connect 업로드 (Xcode 또는 Fastlane)
- [ ] Android: AAB(App Bundle) 생성 → Play Console 업로드
- [ ] 앱 심사 제출 (iOS 평균 24~48시간, Android 수시간~수일)

#### 5-2. 출시 타이밍
- [ ] 심사 통과 후 수동 출시 설정 (자동 출시 대신)
- [ ] iOS/Android 동시 출시 조율
- [ ] 출시일 확정 (화~목 권장, 주말/공휴일 피하기)

#### 5-3. 출시 후 모니터링
- [ ] 크래시 모니터링 대시보드 확인 (24시간 집중 모니터링)
- [ ] 사용자 리뷰 확인 및 응대 체계 구축
- [ ] 핵심 지표 트래킹:
  - DAU/WAU/MAU
  - 가정 생성률, 자녀 등록률
  - 일정 생성 빈도
  - 리텐션 (D1, D7, D30)
- [ ] 핫픽스 배포 파이프라인 준비

---

## 기술적 고려사항

### Next.js 정적 내보내기 전환

Capacitor는 정적 파일을 서빙하므로, 현재 SSR/서버 컴포넌트를 사용하는 부분을 조정해야 합니다.

**필요한 변경**:
1. `next.config.ts`에 `output: 'export'` 추가
2. 서버 컴포넌트 → 클라이언트 컴포넌트로 전환 (또는 API 호출로 대체)
3. `/api/*` 라우트를 Supabase 직접 호출 또는 별도 API 서버로 분리
4. `middleware.ts` 인증 로직을 클라이언트 사이드로 이동
5. `next/image` → `<img>` 태그 또는 Capacitor 이미지 플러그인으로 교체

**대안 — Capacitor + 라이브 서버 하이브리드**:
- 정적 내보내기 대신, Capacitor WebView가 Vercel 배포 URL을 로드하는 방식
- 장점: SSR/API 라우트 유지, 코드 변경 최소화
- 단점: 오프라인 동작 제한, 네트워크 의존성 증가, Apple 심사 거절 위험(4.2 가이드라인)
- **권장**: 핵심 화면은 정적 번들, API는 Supabase 직접 호출 구조

### 푸시 알림 아키텍처

```
사용자 일정 등록/수정
    ↓
Supabase Database Trigger / Edge Function
    ↓
FCM (Android) / APNs (iOS)
    ↓
Capacitor Push Notifications Plugin
    ↓
앱 내 알림 표시
```

- 일정 시작 전 리마인더 (30분/1시간 전)
- 돌봄 갭 발생 시 경고 알림
- 가정 구성원의 일정 변경 알림

### 데이터 아키텍처 변경

현재 Supabase 직접 연결 구조를 유지하되, 모바일 환경에 맞는 최적화가 필요합니다:

- **오프라인 우선**: Capacitor Storage 또는 SQLite 플러그인으로 로컬 캐시
- **동기화**: Supabase Realtime 구독 + 로컬 큐 기반 충돌 해결
- **인증 토큰**: Capacitor Secure Storage에 안전하게 저장

---

## 비용 추정

| 항목 | 비용 | 빈도 |
|------|------|------|
| Apple Developer Program | $99 | 연간 |
| Google Play Console | $25 | 일회성 |
| Vercel (현재 플랜 유지 시) | $0~20 | 월간 |
| Supabase (Free → Pro 전환 시) | $0~25 | 월간 |
| Sentry (에러 모니터링) | $0~26 | 월간 |
| D-U-N-S 번호 (조직 계정 시) | 무료 | 일회성 |
| **초기 비용 합계** | **~$124~$195** | — |

---

## 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Apple 심사 거절 (웹뷰 래핑) | 높음 | 푸시 알림, 위젯 등 네이티브 기능 최소 1개 통합 |
| 정적 내보내기 전환 공수 | 중간 | SSR 의존성 사전 분석, 단계적 전환 |
| 아동 데이터 규제 | 높음 | COPPA/국내 아동 개인정보법 법률 검토, 부모 동의 흐름 구현 |
| 오프라인 동기화 충돌 | 중간 | Last-write-wins + 충돌 알림 UI |
| 앱 크기 비대 | 낮음 | 번들 분석, 코드 스플리팅, 이미지 최적화 |

---

## 타임라인 요약

```
[마일스톤 1] 출시 사전 요건 ──────────── 4~6주
[마일스톤 2] Capacitor 통합 ───────────── 2~3주
[마일스톤 3] 스토어 등록 준비 ──────────── 1~2주  (마일스톤 2와 병행 가능)
[마일스톤 4] 테스트 및 QA ────────────── 2~3주
[마일스톤 5] 정식 출시 ──────────────── 1주
                                    ─────────
                              총 예상: 10~15주
```

마일스톤 2와 3은 병행 가능하므로, 실질적으로 **10~12주(약 3개월)** 정도 소요될 것으로 예상됩니다.

---

## 출시 후 로드맵 (v1.1+)

- iOS 위젯 (오늘의 일정 요약, WidgetKit)
- Apple Watch 앱 (일정 알림)
- 앱 내 채팅/메모 (부모 간 소통)
- 캘린더 앱 연동 (Google Calendar, Apple Calendar)
- AI 기반 돌봄 일정 추천
- 다국어 지원 확대 (영어, 일본어)
