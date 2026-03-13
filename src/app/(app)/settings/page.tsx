'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Users, Baby, LogOut, Check } from 'lucide-react'
import type { Profile, Family } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'
import { Tooltip } from '@/components/ui/tooltip'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([])
  const [displayName, setDisplayName] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setDisplayName(profileData.display_name)

      if (profileData.family_id) {
        const { data: familyData } = await supabase
          .from('families')
          .select('*')
          .eq('id', profileData.family_id)
          .single()

        if (familyData) setFamily(familyData)

        const { data: members } = await supabase
          .from('profiles')
          .select('*')
          .eq('family_id', profileData.family_id)

        if (members) setFamilyMembers(members)
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveName = async () => {
    if (!profile || !displayName.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', profile.id)
    setSaving(false)
    fetchData()
  }

  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) {
    return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>
  }

  return (
    <div className="page-shell">
      <PageHeader
        kicker="Settings"
        title="가족 설정"
        subtitle="프로필, 초대 코드, 연결된 자녀 관리 진입점을 한 흐름으로 정리했습니다."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">내 프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: profile.color }}
              >
                {profile.display_name[0]}
              </div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={saving || displayName === profile.display_name}
                  >
                    {saving ? '...' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 가족 정보 */}
        {family && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {family.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 초대코드 */}
              <div>
                <Label className="text-xs text-muted-foreground">배우자 초대코드</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-[20px] bg-secondary px-4 py-3 text-center font-mono text-lg tracking-[0.24em] text-foreground uppercase">
                    {family.invite_code}
                  </code>
                  <Tooltip label={copied ? '복사됨' : '초대코드 복사'}>
                    <Button variant="outline" size="icon" onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  이 코드를 배우자에게 공유하면 같은 가족으로 합류할 수 있습니다.
                </p>
              </div>

              {/* 가족 구성원 */}
              <div>
                <Label className="text-xs text-muted-foreground">가족 구성원</Label>
                <div className="mt-1 space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.display_name[0]}
                      </div>
                      <span className="text-sm">{member.display_name}</span>
                      {member.id === profile.id && (
                        <Badge variant="secondary" className="text-xs">나</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          onClick={() => router.push('/children')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              router.push('/children')
            }
          }}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Baby className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium tracking-[-0.02em]">자녀 관리</p>
                <p className="text-sm text-muted-foreground">학교, 학년, 돌봄 시간창을 관리합니다.</p>
              </div>
            </div>
            <span className="text-muted-foreground">›</span>
          </CardContent>
        </Card>

        {/* 로그아웃 */}
        <Button variant="outline" className="w-full text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
