'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDay, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useModalDialog } from '@/hooks/useModalDialog'
import { Plus, X, Check, Square, CheckSquare, Trash2, PencilLine } from 'lucide-react'
import type { Supply, Child, Schedule } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'
import { Notice } from '@/components/ui/notice'

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null)
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

    const [suppliesRes, childrenRes, schedulesRes] = await Promise.all([
      supabase.from('supplies').select('*').eq('family_id', profile.family_id).order('target_date').order('created_at'),
      supabase.from('children').select('*').eq('family_id', profile.family_id).order('sort_order'),
      supabase.from('schedules').select('*').eq('family_id', profile.family_id).order('start_time'),
    ])

    if (suppliesRes.data) setSupplies(suppliesRes.data)
    if (childrenRes.data) setChildren(childrenRes.data)
    if (schedulesRes.data) setSchedules(schedulesRes.data)
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
                            onClick={() => {
                              setEditingSupply(supply)
                              setShowForm(true)
                            }}
                            className="shrink-0"
                            aria-label={`${supply.title} 수정`}
                          >
                            <PencilLine className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
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
          schedules={schedules}
          supply={editingSupply}
          onClose={() => {
            setShowForm(false)
            setEditingSupply(null)
          }}
          onSaved={() => {
            setShowForm(false)
            setEditingSupply(null)
            fetchData()
          }}
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
  schedules,
  supply,
  onClose,
  onSaved,
}: {
  familyId: string
  childList: Child[]
  schedules: Schedule[]
  supply?: Supply | null
  onClose: () => void
  onSaved: () => void
}) {
  const [childId, setChildId] = useState(supply?.child_id ?? childList[0]?.id ?? '')
  const [title, setTitle] = useState(supply?.title ?? '')
  const [targetDate, setTargetDate] = useState(supply?.target_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [selectedScheduleId, setSelectedScheduleId] = useState(supply?.schedule_id ?? '')
  const [notes, setNotes] = useState(supply?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const { dialogRef, closeButtonRef } = useModalDialog(onClose)

  const matchingSchedules = schedules.filter(schedule => {
    if (!targetDate || schedule.child_id !== childId) {
      return false
    }

    if (schedule.is_recurring) {
      return schedule.day_of_week === getDay(parseISO(targetDate))
    }

    return schedule.specific_date === targetDate
  })

  useEffect(() => {
    if (!matchingSchedules.some(schedule => schedule.id === selectedScheduleId)) {
      setSelectedScheduleId('')
    }
  }, [matchingSchedules, selectedScheduleId])

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    setLoading(true)
    setError('')

    try {
      const payload = {
        family_id: familyId,
        child_id: childId,
        schedule_id: selectedScheduleId || null,
        title: title.trim(),
        target_date: targetDate || null,
        notes: notes.trim() || null,
      }

      if (supply) {
        const { error: err } = await supabase.from('supplies').update(payload).eq('id', supply.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('supplies').insert(payload)
        if (err) throw err
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supply-form-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-background"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <h2 id="supply-form-title" className="text-lg font-bold">{supply ? '준비물 수정' : '준비물 추가'}</h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="space-y-3 px-6 py-5">
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
            <Label>관련 일정 (선택)</Label>
            {matchingSchedules.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedScheduleId('')}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    !selectedScheduleId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  선택 안 함
                </button>
                {matchingSchedules.map(schedule => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => setSelectedScheduleId(schedule.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedScheduleId === schedule.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {schedule.start_time.slice(0, 5)} {schedule.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">선택한 날짜에 연결할 일정이 없습니다.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>메모 (선택)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="추가 정보" />
          </div>
        </div>

        <div className="sticky bottom-0 border-t bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
          {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
          <Button onClick={handleSave} disabled={loading} className="h-12 w-full">
            <Check className="mr-1 h-4 w-4" />
            {loading ? '저장 중...' : supply ? '수정하기' : '추가하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
