'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useModalDialog } from '@/hooks/useModalDialog'
import { Plus, X, Check, Square, CheckSquare, Trash2 } from 'lucide-react'
import type { Supply, Child } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'
import { Notice } from '@/components/ui/notice'

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [pendingDeleteSupply, setPendingDeleteSupply] = useState<Supply | null>(null)
  const [deletingSupplyId, setDeletingSupplyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) return
    setFamilyId(profile.family_id)

    const [suppliesRes, childrenRes] = await Promise.all([
      supabase.from('supplies').select('*').eq('family_id', profile.family_id).order('target_date').order('created_at'),
      supabase.from('children').select('*').eq('family_id', profile.family_id).order('sort_order'),
    ])

    if (suppliesRes.data) setSupplies(suppliesRes.data)
    if (childrenRes.data) setChildren(childrenRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleCheck = async (supply: Supply) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase
      .from('supplies')
      .update({
        is_checked: !supply.is_checked,
        checked_at: !supply.is_checked ? now : null,
        checked_by: !supply.is_checked ? userId : null,
      })
      .eq('id', supply.id)
    fetchData()
  }

  const deleteSupply = async (id: string) => {
    setDeletingSupplyId(id)
    setActionError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('supplies').delete().eq('id', id)
      if (error) throw error
      setPendingDeleteSupply(null)
      await fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '준비물 삭제에 실패했습니다.')
    } finally {
      setDeletingSupplyId(null)
    }
  }

  // 날짜별로 그룹화
  const today = format(new Date(), 'yyyy-MM-dd')
  const groupedSupplies = supplies.reduce<Record<string, Supply[]>>((acc, supply) => {
    const key = supply.target_date ?? '미정'
    if (!acc[key]) acc[key] = []
    acc[key].push(supply)
    return acc
  }, {})

  // 미체크 건수
  const uncheckedCount = supplies.filter(s => !s.is_checked).length

  return (
    <div className="page-shell">
      <PageHeader
        kicker="Supplies"
        title="준비물 관리"
        subtitle="날짜별 체크리스트를 차분하게 정리해 등교 전 확인 부담을 줄입니다."
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> 준비물 추가
          </Button>
        }
        leading={uncheckedCount > 0 ? <Badge variant="destructive">{uncheckedCount}개 미확인</Badge> : undefined}
      />

      <div className="space-y-4">
        {actionError && (
          <Notice variant="destructive" title="작업을 완료하지 못했습니다" role="alert">
            {actionError}
          </Notice>
        )}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</CardContent>
          </Card>
        ) : supplies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <span className="text-3xl">📋</span>
            </div>
            <p className="mt-6 text-lg font-semibold tracking-[-0.03em]">등록된 준비물이 없습니다.</p>
            <p className="mt-2 text-sm text-muted-foreground">등교 전 체크할 항목을 날짜별로 정리해둘 수 있습니다.</p>
            <Button className="mt-6" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> 준비물 추가
            </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedSupplies)
            .sort(([a], [b]) => a === '미정' ? 1 : b === '미정' ? -1 : a.localeCompare(b))
            .map(([dateKey, items]) => (
              <div key={dateKey}>
                <h2 className="mb-2 text-sm font-semibold tracking-[-0.02em] text-foreground">
                  {dateKey === '미정' ? '날짜 미정' :
                    dateKey === today ? '오늘' :
                    format(new Date(dateKey), 'M월 d일 (EEE)', { locale: ko })}
                </h2>
                <div className="space-y-1.5">
                  {items.map(supply => {
                    const child = children.find(c => c.id === supply.child_id)
                    return (
                      <Card key={supply.id} className={supply.is_checked ? 'opacity-60' : ''}>
                        <CardContent className="flex items-center gap-3 p-3">
                          <button onClick={() => toggleCheck(supply)} className="shrink-0">
                            {supply.is_checked ? (
                              <CheckSquare className="h-5 w-5 text-green-500" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${supply.is_checked ? 'line-through text-muted-foreground' : ''}`}>
                              {supply.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {child && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: child.color }} />
                                  <span className="text-xs text-muted-foreground">{child.name}</span>
                                </div>
                              )}
                              {supply.notes && (
                                <span className="text-xs text-muted-foreground truncate">{supply.notes}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteSupply(supply)}
                            className="shrink-0"
                            aria-label={`${supply.title} 삭제`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {showForm && familyId && children.length > 0 && (
        <SupplyForm
          familyId={familyId}
          childList={children}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData() }}
        />
      )}

      {pendingDeleteSupply && (
        <ConfirmDialog
          title="준비물을 삭제할까요?"
          description={`'${pendingDeleteSupply.title}' 항목을 삭제하면 다시 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          variant="destructive"
          loading={deletingSupplyId === pendingDeleteSupply.id}
          onCancel={() => {
            if (!deletingSupplyId) {
              setPendingDeleteSupply(null)
            }
          }}
          onConfirm={() => deleteSupply(pendingDeleteSupply.id)}
        />
      )}
    </div>
  )
}

function SupplyForm({
  familyId,
  childList,
  onClose,
  onSaved,
}: {
  familyId: string
  childList: Child[]
  onClose: () => void
  onSaved: () => void
}) {
  const [childId, setChildId] = useState(childList[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const { dialogRef, closeButtonRef } = useModalDialog(onClose)

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    setLoading(true)
    setError('')

    try {
      const { error: err } = await supabase.from('supplies').insert({
        family_id: familyId,
        child_id: childId,
        title: title.trim(),
        target_date: targetDate || null,
        notes: notes.trim() || null,
      })
      if (err) throw err
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supply-form-title"
        className="w-full max-w-lg bg-background rounded-t-2xl p-6 space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="supply-form-title" className="text-lg font-bold">준비물 추가</h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>자녀</Label>
            <div className="flex gap-2 flex-wrap">
              {childList.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setChildId(child.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    childId === child.id ? 'text-white' : 'bg-muted text-muted-foreground'
                  }`}
                  style={childId === child.id ? { backgroundColor: child.color } : {}}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>준비물 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 체육복, 물감 세트" />
          </div>
          <div className="space-y-1.5">
            <Label>필요한 날짜</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>메모 (선택)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 정보" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <Button onClick={handleSave} disabled={loading} className="w-full h-12">
          <Check className="h-4 w-4 mr-1" />
          {loading ? '저장 중...' : '추가하기'}
        </Button>
      </div>
    </div>
  )
}
