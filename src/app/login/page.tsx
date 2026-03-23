'use client'

import { FormEvent, useMemo, useState } from 'react'
import { createClient, hasSupabaseBrowserEnv } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ArrowRight, HeartHandshake, Mail, UserRound } from 'lucide-react'

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
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent text-accent-foreground shadow-[var(--shadow-subtle)]">
              <HeartHandshake className="h-7 w-7" />
            </div>
            <CardTitle className="text-[2rem] tracking-[-0.05em]">돌봄돌봄</CardTitle>
            <CardDescription className="mt-2 max-w-sm">
              가족 돌봄 일정을 함께 관리할 수 있는 간단한 로그인 화면입니다.
            </CardDescription>
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
                      disabled={!authConfigured || isSubmitting}
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
                    disabled={!authConfigured || isSubmitting}
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
                  disabled={!authConfigured || isSubmitting}
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
                    disabled={!authConfigured || isSubmitting}
                  />
                </label>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={!authConfigured || isSubmitting}
              >
                {isSubmitting ? '처리 중...' : modeCopy.submitLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <p className="text-center text-xs leading-6 text-muted-foreground">
            로그인하거나 회원가입하면 서비스 이용약관과 개인정보 처리방침에 동의하는 것으로 간주합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
