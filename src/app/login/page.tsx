'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const supabase = createClient()

  // Google 로그인
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  // 카카오 로그인
  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🏠</span>
          </div>
          <div>
            <CardTitle className="text-2xl">돌봄돌봄</CardTitle>
            <CardDescription className="mt-2">
              맞벌이 부모를 위한 자녀 돌봄 일정 관리
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 text-base gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 시작하기
          </Button>
          <Button
            onClick={handleKakaoLogin}
            className="w-full h-12 text-base gap-3"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.43c0 2.62 1.75 4.93 4.38 6.24-.19.72-.7 2.6-.8 3.01-.12.5.18.5.39.36.16-.1 2.59-1.76 3.63-2.47.78.11 1.58.17 2.4.17 5.52 0 10-3.36 10-7.31S17.52 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </Button>
          <p className="text-xs text-center text-muted-foreground pt-2">
            로그인하면 이용약관에 동의하는 것으로 간주합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
