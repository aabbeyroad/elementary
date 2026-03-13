'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Step = 'choose' | 'create' | 'join'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('choose')
  const [familyName, setFamilyName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // 새 가족 만들기
  const handleCreateFamily = async () => {
    if (!familyName.trim() || !displayName.trim()) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 가족 생성
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName.trim() })
        .select()
        .single()

      if (familyError) throw familyError

      // 프로필에 가족 연결 + 이름 설정
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          family_id: family.id,
          display_name: displayName.trim(),
          color: '#6366f1', // 기본 보라색
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 초대코드로 가족 합류
  const handleJoinFamily = async () => {
    if (!inviteCode.trim() || !displayName.trim()) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 초대코드로 가족 찾기 (RLS 우회를 위해 rpc 사용)
      // invite_code는 MD5 hex(소문자)이므로 toLowerCase() 변환
      const normalizedCode = inviteCode.trim().toLowerCase()
      const { data: familyData, error: familyError } = await supabase
        .rpc('find_family_by_invite_code', { code: normalizedCode })

      // RPC returns TABLE type → array
      const family = Array.isArray(familyData) ? familyData[0] : familyData
      if (familyError || !family) {
        setError('유효하지 않은 초대코드입니다. 코드를 다시 확인해주세요.')
        return
      }

      // 프로필에 가족 연결
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          family_id: family.id,
          display_name: displayName.trim(),
          color: '#ec4899', // 두 번째 부모는 핑크
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      {step === 'choose' && (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <span className="text-3xl">👨‍👩‍👧‍👦</span>
            </div>
            <CardTitle>가족 설정</CardTitle>
            <CardDescription>
              돌봄돌봄을 시작하려면 가족을 만들거나, 초대코드로 합류하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setStep('create')} className="w-full h-12" size="lg">
              새 가족 만들기
            </Button>
            <Button onClick={() => setStep('join')} variant="outline" className="w-full h-12" size="lg">
              초대코드로 합류하기
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'create' && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>새 가족 만들기</CardTitle>
            <CardDescription>
              가족 이름과 앱에서 사용할 닉네임을 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">가족 이름</Label>
              <Input
                id="familyName"
                placeholder="예: 김씨 가족"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">나의 닉네임</Label>
              <Input
                id="displayName"
                placeholder="예: 아빠, 엄마, 이름 등"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                뒤로
              </Button>
              <Button onClick={handleCreateFamily} disabled={loading} className="flex-1">
                {loading ? '생성 중...' : '만들기'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'join' && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>가족에 합류하기</CardTitle>
            <CardDescription>
              배우자에게 받은 6자리 초대코드를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">초대코드</Label>
              <Input
                id="inviteCode"
                placeholder="6자리 코드"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDisplayName">나의 닉네임</Label>
              <Input
                id="joinDisplayName"
                placeholder="예: 아빠, 엄마, 이름 등"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                뒤로
              </Button>
              <Button onClick={handleJoinFamily} disabled={loading} className="flex-1">
                {loading ? '합류 중...' : '합류하기'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
