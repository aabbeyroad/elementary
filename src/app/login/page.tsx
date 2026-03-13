'use client'

import { FormEvent, useMemo, useState } from 'react'
import { createClient, hasSupabaseBrowserEnv } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'

type AuthMode = 'signin' | 'signup'
type NoticeState = {
  variant: 'success' | 'warning' | 'destructive'
  title: string
  body: string
} | null

export default function LoginPage() {
  const authConfigured = hasSupabaseBrowserEnv()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeProvider, setActiveProvider] = useState<'google' | 'kakao' | null>(null)
  const [notice, setNotice] = useState<NoticeState>(null)

  const modeCopy = useMemo(() => {
    if (mode === 'signup') {
      return {
        title: '이메일로 회원가입',
        description: '계정을 만든 뒤 가족 생성 또는 초대코드 연결을 이어서 진행합니다.',
        submitLabel: '회원가입하고 시작하기',
      }
    }

    return {
      title: '이메일로 로그인',
      description: '이미 만든 계정으로 바로 일정과 준비물을 이어서 확인합니다.',
      submitLabel: '이메일로 로그인',
    }
  }, [mode])

  const resetNotice = () => setNotice(null)

  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    if (!authConfigured) return

    try {
      resetNotice()
      setActiveProvider(provider)
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setNotice({
          variant: 'destructive',
          title: '소셜 로그인 실패',
          body: error.message,
        })
      }
    } finally {
      setActiveProvider(null)
    }
  }

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!authConfigured) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setNotice({
        variant: 'warning',
        title: '입력 확인 필요',
        body: '이메일과 비밀번호를 먼저 입력해주세요.',
      })
      return
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setNotice({
          variant: 'warning',
          title: '이름을 입력해주세요',
          body: '가족 구성원에게 표시할 이름이 필요합니다.',
        })
        return
      }

      if (password.length < 6) {
        setNotice({
          variant: 'warning',
          title: '비밀번호가 너무 짧습니다',
          body: '비밀번호는 6자 이상으로 입력해주세요.',
        })
        return
      }

      if (password !== confirmPassword) {
        setNotice({
          variant: 'warning',
          title: '비밀번호가 일치하지 않습니다',
          body: '확인용 비밀번호를 다시 확인해주세요.',
        })
        return
      }
    }

    try {
      resetNotice()
      setIsSubmitting(true)
      const supabase = createClient()

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (error) {
          setNotice({
            variant: 'destructive',
            title: '로그인 실패',
            body: error.message,
          })
          return
        }

        window.location.assign('/dashboard')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: fullName.trim(),
          },
        },
      })

      if (error) {
        setNotice({
          variant: 'destructive',
          title: '회원가입 실패',
          body: error.message,
        })
        return
      }

      if (data.session) {
        window.location.assign('/onboarding')
        return
      }

      setNotice({
        variant: 'success',
        title: '이메일 확인이 필요합니다',
        body: '메일함의 인증 링크를 누르면 바로 로그인할 수 있습니다.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-shell min-h-dvh items-center justify-center py-10">
      <Card className="w-full max-w-[520px]">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="hero-kicker">Family Planner</p>
              <div>
                <CardTitle className="text-[2rem] tracking-[-0.05em]">돌봄돌봄에 로그인</CardTitle>
                <CardDescription className="mt-2 max-w-md">
                  가족 일정과 준비물을 하나의 흐름으로 관리할 수 있도록, 같은 톤의 간결한 인증 화면으로 정리했습니다.
                </CardDescription>
              </div>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent text-accent-foreground shadow-[var(--shadow-subtle)]">
              <LockKeyhole className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {!authConfigured ? (
            <Notice variant="warning" title="로그인 설정 필요">
              Supabase 인증 환경변수가 없어 현재 빌드에서는 로그인과 회원가입 버튼이 비활성화됩니다.
            </Notice>
          ) : null}

          {notice ? (
            <Notice variant={notice.variant} title={notice.title}>
              {notice.body}
            </Notice>
          ) : null}

          <div className="surface-card-muted space-y-4 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">빠르게 시작하기</p>
              <p className="text-sm leading-6 text-muted-foreground">
                기존 계정이 있다면 소셜 로그인으로 바로 이어갈 수 있습니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => void handleOAuthLogin('google')}
                variant="outline"
                className="w-full gap-3"
                disabled={!authConfigured || isSubmitting || activeProvider !== null}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {activeProvider === 'google' ? 'Google 연결 중...' : 'Google로 계속'}
              </Button>

              <Button
                onClick={() => void handleOAuthLogin('kakao')}
                className="w-full gap-3 border border-transparent"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
                disabled={!authConfigured || isSubmitting || activeProvider !== null}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
                  <path d="M12 3C6.48 3 2 6.36 2 10.43c0 2.62 1.75 4.93 4.38 6.24-.19.72-.7 2.6-.8 3.01-.12.5.18.5.39.36.16-.1 2.59-1.76 3.63-2.47.78.11 1.58.17 2.4.17 5.52 0 10-3.36 10-7.31S17.52 3 12 3z"/>
                </svg>
                {activeProvider === 'kakao' ? '카카오 연결 중...' : '카카오로 계속'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/80" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border/80" />
            </div>

            <div className="space-y-4">
              <SegmentedControl
                items={[
                  { label: '이메일 로그인', active: mode === 'signin', onClick: () => { setMode('signin'); resetNotice() } },
                  { label: '회원가입', active: mode === 'signup', onClick: () => { setMode('signup'); resetNotice() } },
                ]}
              />

              <form className="space-y-4" onSubmit={handleEmailAuth}>
                <div className="space-y-1">
                  <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">{modeCopy.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{modeCopy.description}</p>
                </div>

                {mode === 'signup' ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">이름</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="가족에게 보여질 이름"
                        className="pl-11"
                        disabled={!authConfigured || isSubmitting || activeProvider !== null}
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">이메일</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="pl-11"
                      autoComplete="email"
                      disabled={!authConfigured || isSubmitting || activeProvider !== null}
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">비밀번호</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === 'signup' ? '6자 이상 비밀번호' : '비밀번호 입력'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={!authConfigured || isSubmitting || activeProvider !== null}
                  />
                </label>

                {mode === 'signup' ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">비밀번호 확인</span>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="비밀번호를 한 번 더 입력"
                      autoComplete="new-password"
                      disabled={!authConfigured || isSubmitting || activeProvider !== null}
                    />
                  </label>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!authConfigured || isSubmitting || activeProvider !== null}
                >
                  {isSubmitting ? '처리 중...' : modeCopy.submitLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs leading-6 text-muted-foreground">
            로그인하거나 회원가입하면 서비스 이용약관과 개인정보 처리방침에 동의하는 것으로 간주합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
