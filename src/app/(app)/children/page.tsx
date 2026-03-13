'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useModalDialog } from '@/hooks/useModalDialog'
import { Plus, Pencil, Trash2, X, Check, ArrowLeft } from 'lucide-react'
import { timeToMinutes } from '@/lib/utils/schedule-helpers'
import type { Child } from '@/types/database'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Notice } from '@/components/ui/notice'
import { Select } from '@/components/ui/select'

const CHILD_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6']

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [pendingDeleteChild, setPendingDeleteChild] = useState<Child | null>(null)
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [familyId, setFamilyId] = useState<string | null>(null)

  const fetchChildren = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) return
    setFamilyId(profile.family_id)

    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('sort_order')

    if (data) setChildren(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const handleDelete = async (childId: string) => {
    setDeletingChildId(childId)
    setActionError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('children').delete().eq('id', childId)
      if (error) throw error
      setPendingDeleteChild(null)
      await fetchChildren()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '자녀 삭제에 실패했습니다.')
    } finally {
      setDeletingChildId(null)
    }
  }

  const handleEdit = (child: Child) => {
    setEditingChild(child)
    setShowForm(true)
  }

  return (
    <div className="page-shell">
      <PageHeader
        kicker="Children"
        title="자녀 관리"
        actions={
          <Button size="sm" onClick={() => { setEditingChild(null); setShowForm(true) }}>
            <Plus className="h-4 w-4" />
            자녀 추가
          </Button>
        }
        leading={
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              설정으로
            </Button>
          </Link>
        }
      />

      <div className="space-y-3">
        {actionError && (
          <Notice variant="destructive" title="작업을 완료하지 못했습니다" role="alert">
            {actionError}
          </Notice>
        )}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</CardContent>
          </Card>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <span className="text-3xl">👶</span>
            </div>
            <p className="mt-6 text-lg font-semibold tracking-[-0.03em]">등록된 자녀가 없습니다.</p>
            <p className="mt-2 text-sm text-muted-foreground">첫 자녀를 등록하면 모든 일정 보기가 활성화됩니다.</p>
            <Button className="mt-6" onClick={() => { setEditingChild(null); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-1" />
              첫 자녀 등록하기
            </Button>
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <Card key={child.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: child.color }}
                  >
                    {child.name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {child.school_name && <span>{child.school_name}</span>}
                      {child.grade && <Badge variant="secondary" className="text-xs">{child.grade}학년</Badge>}
                      {child.class_number && <span>{child.class_number}반</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      돌봄 시간: {child.care_window_start?.slice(0, 5)} ~ {child.care_window_end?.slice(0, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(child)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDeleteChild(child)}
                    aria-label={`${child.name} 삭제`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 자녀 추가/수정 폼 (바텀시트 스타일) */}
      {showForm && (
        <ChildForm
          familyId={familyId!}
          child={editingChild}
          childCount={children.length}
          onClose={() => { setShowForm(false); setEditingChild(null) }}
          onSaved={() => { setShowForm(false); setEditingChild(null); fetchChildren() }}
        />
      )}

      {pendingDeleteChild && (
        <ConfirmDialog
          title="자녀를 삭제할까요?"
          description={`${pendingDeleteChild.name}과 연결된 일정 및 준비물도 함께 삭제됩니다.`}
          confirmLabel="삭제"
          variant="destructive"
          loading={deletingChildId === pendingDeleteChild.id}
          onCancel={() => {
            if (!deletingChildId) {
              setPendingDeleteChild(null)
            }
          }}
          onConfirm={() => handleDelete(pendingDeleteChild.id)}
        />
      )}
    </div>
  )
}

function ChildForm({
  familyId,
  child,
  childCount,
  onClose,
  onSaved,
}: {
  familyId: string
  child: Child | null
  childCount: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(child?.name ?? '')
  const [schoolName, setSchoolName] = useState(child?.school_name ?? '')
  const [grade, setGrade] = useState(child?.grade?.toString() ?? '')
  const [classNumber, setClassNumber] = useState(child?.class_number?.toString() ?? '')
  const [careStart, setCareStart] = useState(child?.care_window_start?.slice(0, 5) ?? '13:00')
  const [careEnd, setCareEnd] = useState(child?.care_window_end?.slice(0, 5) ?? '18:00')
  const [color, setColor] = useState(child?.color ?? CHILD_COLORS[childCount % CHILD_COLORS.length])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const { dialogRef, closeButtonRef } = useModalDialog(onClose)
  const hasTimeWindowError = timeToMinutes(careStart) >= timeToMinutes(careEnd)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (hasTimeWindowError) {
      setError('돌봄 시작 시간은 종료 시간보다 빨라야 합니다.')
      return
    }
    setLoading(true)
    setError('')

    const data = {
      family_id: familyId,
      name: name.trim(),
      school_name: schoolName.trim() || null,
      grade: grade ? parseInt(grade) : null,
      class_number: classNumber ? parseInt(classNumber) : null,
      care_window_start: careStart,
      care_window_end: careEnd,
      color,
      sort_order: child?.sort_order ?? childCount,
    }

    try {
      if (child) {
        const { error: err } = await supabase
          .from('children')
          .update(data)
          .eq('id', child.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('children')
          .insert(data)
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-form-title"
        className="w-full max-w-lg bg-background rounded-t-2xl p-6 space-y-4 animate-in slide-in-from-bottom"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="child-form-title" className="text-lg font-bold">{child ? '자녀 수정' : '자녀 추가'}</h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>이름 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="아이 이름" />
          </div>

          <div className="space-y-1.5">
            <Label>학교</Label>
            <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="예: ○○초등학교" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>학년</Label>
              <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">선택</option>
                {[1, 2, 3, 4, 5, 6].map(g => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>반</Label>
              <Input
                type="number"
                value={classNumber}
                onChange={(e) => setClassNumber(e.target.value)}
                placeholder="반"
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>돌봄 시작 시간</Label>
              <Input type="time" value={careStart} onChange={(e) => setCareStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>돌봄 종료 시간</Label>
              <Input type="time" value={careEnd} onChange={(e) => setCareEnd(e.target.value)} />
            </div>
          </div>
          {hasTimeWindowError && (
            <p className="text-sm text-destructive" role="alert">
              돌봄 시작 시간은 종료 시간보다 빨라야 합니다.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>색상</Label>
            <div className="flex gap-2">
              {CHILD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#000' : 'transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <Button onClick={handleSave} disabled={loading} className="w-full h-12">
          <Check className="h-4 w-4 mr-1" />
          {loading ? '저장 중...' : child ? '수정 완료' : '추가하기'}
        </Button>
      </div>
    </div>
  )
}
