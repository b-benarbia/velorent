'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CalendarDays, Phone, Mail, Bike, Check, ArrowRight,
  Plus, Search, Star, X, ChevronLeft, ChevronRight,
  AlertCircle, Pencil, Clock, CheckCircle2, BellRing,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import DateTimePicker from './_components/DateTimePicker'

interface BikeRecord {
  id: string
  name: string
  code: string
  dailyRate: number
  status: string
}

const BIKE_TYPE_LABEL: Record<string, string> = {
  CITY: 'City', ELECTRIC: 'Electric', MOUNTAIN: 'Mountain',
  ROAD: 'Road', CARGO: 'Cargo', KIDS: 'Kids', ESCOOTER: 'E-Scooter',
  TANDEM: 'Tandem', FATBIKE: 'Fat Bike', EMTB: 'E-MTB',
}

interface Reservation {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  bikeId: string | null
  bikeType: string | null
  startAt: string
  endAt: string
  notes: string | null
  status: string
  createdAt: string
  bike?: { name: string; code: string } | null
}

// Outside component — stable, never recreated
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_BADGE: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:    { bg: '#fffbeb', border: '#fde68a',  text: '#92400e' },
  CONFIRMED:  { bg: '#ecfdf5', border: '#a7f3d0',  text: '#065f46' },
  CANCELLED:  { bg: '#fef2f2', border: '#fecaca',  text: '#991b1b' },
  CONVERTED:  { bg: '#eef2ff', border: '#c7d2fe',  text: '#3730a3' },
  NO_SHOW:    { bg: '#fdf4ff', border: '#e9d5ff',  text: '#6b21a8' },
  CHECKED_IN: { bg: '#f0fdf4', border: '#86efac',  text: '#14532d' },
}

const INPUT_CLASS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900'

const NAV_BTN: React.CSSProperties = {
  border: '1.5px solid #e2e8f0', background: 'white', borderRadius: 8,
  padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
}

interface AvailResult { total: number; booked: number; available: number }

// Format ISO datetime to local datetime-local input value
function isoToInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ReservationsPage() {
  const params   = useParams()
  const router   = useRouter()
  const tenant   = params.tenant as string
  const t        = useTranslations('reservations')
  const tStatus  = useTranslations('status')
  const locale   = useLocale()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [bikes, setBikes]     = useState<BikeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [cancelModal, setCancelModal] = useState<{ id: string; name: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [search, setSearch]   = useState('')
  const [now, setNow]         = useState(() => new Date())

  // ── Reminder sending state ────────────────────────────────────────────────
  // Map<reservationId, 'idle' | 'sending' | 'sent'>
  const [reminderState, setReminderState] = useState<Map<string, 'idle' | 'sending' | 'sent'>>(new Map())

  async function sendReminder(id: string) {
    setReminderState(prev => new Map(prev).set(id, 'sending'))
    try {
      const res = await fetch(`/api/reservations/${id}/remind`, { method: 'POST' })
      setReminderState(prev => new Map(prev).set(id, res.ok ? 'sent' : 'idle'))
    } catch {
      setReminderState(prev => new Map(prev).set(id, 'idle'))
    }
  }

  // ── Availability ───────────────────────────────────────────────────────────
  const [avail, setAvail] = useState<Map<string, AvailResult | null>>(new Map())

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState<Reservation | null>(null)
  const [editForm, setEditForm]   = useState({
    startAt: '', endAt: '', notes: '', bikeId: '', bikeType: '',
  })
  const [editSaving, setEditSaving] = useState(false)

  // ── Mini calendar state ────────────────────────────────────────────────────
  const [showCal, setShowCal]           = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calMonth, setCalMonth]         = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }
  })

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    bikeId: '', bikeType: '', startAt: '', endAt: '', notes: '',
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/reservations').then(r => r.json()),
      fetch('/api/bikes').then(r => r.json()),
    ]).then(([res, bk]) => {
      if (!alive) return
      setReservations(Array.isArray(res) ? res : [])
      setBikes(Array.isArray(bk) ? bk : [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Fetch availability for all pending/confirmed reservations after load
  useEffect(() => {
    const pending = reservations.filter(r =>
      (r.status === 'PENDING' || r.status === 'CONFIRMED') && (r.bikeType || r.bikeId)
    )
    if (pending.length === 0) return

    let alive = true
    const ac = new AbortController()

    // Mark all as loading (null = loading)
    setAvail(prev => {
      const next = new Map(prev)
      pending.forEach(r => { if (!next.has(r.id)) next.set(r.id, null) })
      return next
    })

    Promise.all(
      pending.map(async r => {
        const sp = new URLSearchParams({
          start: r.startAt,
          end:   r.endAt,
          excludeId: r.id,
        })
        if (r.bikeId)    sp.set('bikeId',    r.bikeId)
        else if (r.bikeType) sp.set('bikeType', r.bikeType)
        try {
          const res = await fetch(`/api/availability?${sp}`, { signal: ac.signal })
          if (!res.ok) return null
          const data = await res.json() as AvailResult
          return { id: r.id, data }
        } catch { return null }
      })
    ).then(results => {
      if (!alive) return
      setAvail(prev => {
        const next = new Map(prev)
        results.forEach(r => { if (r) next.set(r.id, r.data) })
        return next
      })
    })

    return () => { alive = false; ac.abort() }
  }, [reservations])

  const [todayStr]    = useState(() => localDateStr(new Date()))
  const [tomorrowStr] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d)
  })
  const [in7dStr] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return localDateStr(d)
  })

  const isToday    = (iso: string) => localDateStr(new Date(iso)) === todayStr
  const isTomorrow = (iso: string) => localDateStr(new Date(iso)) === tomorrowStr

  function matchesSearch(r: Reservation) {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.customerName.toLowerCase().includes(q) ||
           (r.customerPhone ?? '').toLowerCase().includes(q) ||
           (r.customerEmail ?? '').toLowerCase().includes(q)
  }

  function getCountdown(startAt: string): string {
    const diff = new Date(startAt).getTime() - now.getTime()
    if (diff <= 0) return ''
    const totalMins = Math.floor(diff / 60_000)
    const days  = Math.floor(totalMins / 1440)
    const hours = Math.floor((totalMins % 1440) / 60)
    const mins  = totalMins % 60
    const pre = t('countdownPrefix'), dU = t('countdownDay'), hU = t('countdownHour'), mU = t('countdownMin')
    if (days > 0)  return `${pre} ${days}${dU} ${hours}${hU}`
    if (hours > 0) return `${pre} ${hours}${hU}${mins > 0 ? ` ${mins}${mU}` : ''}`
    return `${pre} ${mins}${mU}`
  }

  function returningCount(name: string): number {
    const n = name.toLowerCase()
    return reservations.filter(r => r.status === 'CONVERTED' && r.customerName.toLowerCase() === n).length
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerName || !form.startAt || !form.endAt) { setError(t('error')); return }
    setSaving(true); setError('')
    const res  = await fetch('/api/reservations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setReservations(prev => [data, ...prev])
    setShowForm(false)
    setForm({ customerName: '', customerPhone: '', customerEmail: '', bikeId: '', bikeType: '', startAt: '', endAt: '', notes: '' })
    setSaving(false)
  }

  async function updateStatus(id: string, status: string, reason?: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancelReason: reason }),
    })
    if (res.ok) setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function handleCancel() {
    if (!cancelModal) return
    await updateStatus(cancelModal.id, 'CANCELLED', cancelReason.trim() || undefined)
    setCancelModal(null); setCancelReason('')
  }

  function openEdit(r: Reservation) {
    setEditModal(r)
    setEditForm({
      startAt:  isoToInputValue(r.startAt),
      endAt:    isoToInputValue(r.endAt),
      notes:    r.notes ?? '',
      bikeId:   r.bikeId ?? '',
      bikeType: r.bikeType ?? '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    setEditSaving(true)
    const payload: Record<string, string | null> = {
      startAt:  editForm.startAt  ? new Date(editForm.startAt).toISOString()  : editModal.startAt,
      endAt:    editForm.endAt    ? new Date(editForm.endAt).toISOString()    : editModal.endAt,
      notes:    editForm.notes    || null,
      bikeId:   editForm.bikeId   || null,
      bikeType: editForm.bikeType || null,
    }
    const res = await fetch(`/api/reservations/${editModal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated = await res.json()
      setReservations(prev => prev.map(r => r.id === editModal.id ? { ...r, ...updated } : r))
      setEditModal(null)
    }
    setEditSaving(false)
  }

  function convertToRental(reservation: Reservation) {
    router.push(`/${tenant}/rentals/new?reservationId=${reservation.id}`)
  }

  // ── Dot map for calendar ───────────────────────────────────────────────────
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, { pending: number; past: number }>()
    reservations.forEach(r => {
      const key = localDateStr(new Date(r.startAt))
      const cur = map.get(key) ?? { pending: 0, past: 0 }
      if (r.status === 'PENDING' || r.status === 'CONFIRMED') cur.pending++
      else cur.past++
      map.set(key, cur)
    })
    return map
  }, [reservations])

  // ── KPI strip ─────────────────────────────────────────────────────────────
  const kpiToday    = reservations.filter(r => (r.status === 'PENDING' || r.status === 'CONFIRMED') && isToday(r.startAt)).length
  const kpiTomorrow = reservations.filter(r => (r.status === 'PENDING' || r.status === 'CONFIRMED') && isTomorrow(r.startAt)).length
  const kpi7d       = reservations.filter(r => {
    if (r.status !== 'PENDING' && r.status !== 'CONFIRMED') return false
    const ds = localDateStr(new Date(r.startAt))
    return ds >= todayStr && ds <= in7dStr
  }).length

  // ── Sections ───────────────────────────────────────────────────────────────
  const all_pending     = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')
  const todayPending    = all_pending.filter(r => isToday(r.startAt) && matchesSearch(r))
  const tomorrowPending = all_pending.filter(r => isTomorrow(r.startAt) && matchesSearch(r))
  const laterPending    = all_pending
    .filter(r => !isToday(r.startAt) && !isTomorrow(r.startAt) && matchesSearch(r))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const pending = all_pending

  const dateFiltered = selectedDate
    ? reservations
        .filter(r => localDateStr(new Date(r.startAt)) === selectedDate && matchesSearch(r))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    : null

  const past = reservations
    .filter(r => {
      const isHist  = r.status === 'CANCELLED' || r.status === 'CONVERTED' || r.status === 'NO_SHOW' || r.status === 'CHECKED_IN'
      const dateOk  = !selectedDate || localDateStr(new Date(r.startAt)) === selectedDate
      return isHist && dateOk && matchesSearch(r)
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  const hasResults = todayPending.length + tomorrowPending.length + laterPending.length > 0

  // ── Mini calendar ──────────────────────────────────────────────────────────
  function renderMiniCalendar() {
    const { year, month } = calMonth
    const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthLabel  = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
      .format(new Date(year, month, 1))
    const monthFormatted = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
    const dayHdrs = Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i))
    )
    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    const prevMonth = () => setCalMonth(m => {
      const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }
    })
    const nextMonth = () => setCalMonth(m => {
      const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }
    })
    return (
      <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 16,
        padding: '14px 14px 10px', marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={prevMonth} style={NAV_BTN}><ChevronLeft size={15} style={{ color: '#6366f1' }} /></button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{monthFormatted}</span>
          <button onClick={nextMonth} style={NAV_BTN}><ChevronRight size={15} style={{ color: '#6366f1' }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {dayHdrs.map((h, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: '#94a3b8', paddingBottom: 4, textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const dk     = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const counts = reservationsByDate.get(dk)
            const isSel  = selectedDate === dk
            const isTd   = dk === todayStr
            return (
              <button key={i}
                onClick={() => { setSelectedDate(isSel ? null : dk); if (!isSel) setShowCal(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '5px 2px', minHeight: 44,
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isSel ? '#6366f1' : isTd ? '#eef2ff' : 'transparent' }}>
                <span style={{ fontSize: 13, lineHeight: 1, fontWeight: isSel || isTd ? 700 : 400,
                  color: isSel ? 'white' : isTd ? '#6366f1' : '#334155' }}>{day}</span>
                {counts && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                    {counts.pending > 0 && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%',
                        background: isSel ? 'rgba(255,255,255,0.85)' : dk === todayStr ? '#f97316' : '#6366f1' }} />
                    )}
                    {counts.past > 0 && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%',
                        background: isSel ? 'rgba(255,255,255,0.4)' : '#cbd5e1' }} />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Availability badge ─────────────────────────────────────────────────────
  function renderAvailBadge(r: Reservation) {
    if (!r.bikeType && !r.bikeId) return null
    const a = avail.get(r.id)

    // Loading shimmer
    if (a === null || a === undefined) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0',
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
          animation: 'availPulse 1.4s ease-in-out infinite',
        }}>
          <Bike size={9} /> ···
        </span>
      )
    }

    const { available, total } = a

    // Specific bike: binary
    if (r.bikeId) {
      return available > 0 ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        }}>
          <CheckCircle2 size={9} /> {t('availFree')}
        </span>
      ) : (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        }}>
          <AlertCircle size={9} /> {t('availUnavail')}
        </span>
      )
    }

    // Type-based: show count
    if (total === 0) return null

    if (available === 0) return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      }}>
        <AlertCircle size={9} /> {t('availFull')}
      </span>
    )

    if (available === 1) return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      }}>
        <AlertCircle size={9} /> {t('availLeft')}
      </span>
    )

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      }}>
        <CheckCircle2 size={9} /> {available} {t('availDispo')}
      </span>
    )
  }

  // ── Shared card renderer ───────────────────────────────────────────────────
  function renderCard(r: Reservation, variant: 'today' | 'tomorrow' | 'upcoming') {
    const stLabel   = tStatus(r.status.toLowerCase() as Parameters<typeof tStatus>[0])
    const retCount  = returningCount(r.customerName)
    const countdown = variant !== 'upcoming' ? getCountdown(r.startAt) : ''
    const startTime = new Date(r.startAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    const endDate   = new Date(r.endAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
    const stBadge   = STATUS_BADGE[r.status] ?? { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' }
    const isT       = variant === 'today'
    const isTmr     = variant === 'tomorrow'

    const cardStyle = isT ? {
      background: '#fff7ed', border: '1.5px solid #fed7aa', borderLeft: '4px solid #f97316',
      borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(249,115,22,0.08)',
    } : isTmr ? {
      background: '#fefce8', border: '1.5px solid #fef08a', borderLeft: '4px solid #ca8a04',
      borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(202,138,4,0.06)',
    } : {
      background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 16,
    }

    const iconColor  = isT ? '#f97316' : isTmr ? '#ca8a04' : '#cbd5e1'
    const convertBg  = isT ? '#f97316' : isTmr ? '#ca8a04' : '#6366F1'

    return (
      <div key={r.id} style={cardStyle}>
        {/* Top: name / badges / action buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1 }}>
                {r.customerName}
              </p>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: isT ? '#fff7ed' : isTmr ? '#fefce8' : stBadge.bg,
                color:      isT ? '#c2410c' : isTmr ? '#a16207' : stBadge.text,
                border:     `1px solid ${isT ? '#fed7aa' : isTmr ? '#fef08a' : stBadge.border}`,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em',
              }}>{stLabel}</span>
              {retCount > 0 && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                  background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                }}>
                  <Star size={9} style={{ fill: '#f59e0b', color: '#f59e0b', flexShrink: 0 }} />
                  {t('returning')}
                </span>
              )}
              {countdown && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: isT ? '#fff7ed' : '#fefce8',
                  color:      isT ? '#c2410c' : '#a16207',
                  border:     `1px solid ${isT ? '#fed7aa' : '#fef08a'}`,
                }}>
                  <Clock size={9} />{countdown}
                </span>
              )}
            </div>

            {/* Date / time row */}
            {(isT || isTmr) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: isT ? 22 : 17, fontWeight: 800,
                  color: isT ? '#ea580c' : '#a16207', lineHeight: 1 }}>
                  {startTime}
                </span>
                <span style={{ fontSize: 12, color: isT ? '#fb923c' : '#ca8a04', fontWeight: 500 }}>
                  → {endDate}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
                color: '#94a3b8', fontSize: 12 }}>
                <CalendarDays size={12} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                <span>
                  {new Date(r.startAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
                  {' → '}
                  {new Date(r.endAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            )}

            {/* Contact info — clickable */}
            <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {r.customerPhone && (
                <a href={`tel:${r.customerPhone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit',
                    textDecoration: 'none', cursor: 'pointer' }}>
                  <Phone size={11} style={{ color: iconColor, flexShrink: 0 }} />
                  <span style={{ color: isT ? '#c2410c' : isTmr ? '#92400e' : '#475569', fontWeight: 500 }}>
                    {r.customerPhone}
                  </span>
                </a>
              )}
              {r.customerEmail && (
                <a href={`mailto:${r.customerEmail}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit',
                    textDecoration: 'none', cursor: 'pointer' }}>
                  <Mail size={11} style={{ color: iconColor, flexShrink: 0 }} />
                  <span style={{ color: isT ? '#c2410c' : isTmr ? '#92400e' : '#475569', fontWeight: 500 }}>
                    {r.customerEmail}
                  </span>
                </a>
              )}
              {(r.bikeType || r.bike) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <Bike size={11} style={{ color: iconColor, flexShrink: 0 }} />
                    {r.bike ? `${r.bike.name} (${r.bike.code})` : (BIKE_TYPE_LABEL[r.bikeType!] ?? r.bikeType)}
                  </p>
                  {renderAvailBadge(r)}
                </div>
              )}
              {r.notes && (
                <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8', fontSize: 11 }}>
                  {r.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick action buttons (top-right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {r.status === 'PENDING' && (
              <button onClick={() => updateStatus(r.id, 'CONFIRMED')}
                style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8,
                  padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <Check size={11} />{t('confirm')}
              </button>
            )}
            <button onClick={() => openEdit(r)}
              style={{ background: 'white', color: '#6366f1', border: '1.5px solid #c7d2fe',
                borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4 }}>
              <Pencil size={11} />{t('editReservation')}
            </button>
            {r.customerEmail && (
              <button
                onClick={() => sendReminder(r.id)}
                disabled={reminderState.get(r.id) === 'sending' || reminderState.get(r.id) === 'sent'}
                style={{
                  background: reminderState.get(r.id) === 'sent' ? '#f0fdf4' : 'white',
                  color:      reminderState.get(r.id) === 'sent' ? '#15803d' : '#8b5cf6',
                  border:     `1.5px solid ${reminderState.get(r.id) === 'sent' ? '#86efac' : '#ddd6fe'}`,
                  borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700,
                  cursor: reminderState.get(r.id) ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  opacity: reminderState.get(r.id) === 'sending' ? 0.6 : 1,
                  transition: 'all .2s',
                }}>
                {reminderState.get(r.id) === 'sent'
                  ? <CheckCircle2 size={11} />
                  : <BellRing size={11} style={reminderState.get(r.id) === 'sending' ? { animation: 'todayPulse 1s infinite' } : {}} />
                }
                {reminderState.get(r.id) === 'sent' ? t('reminderSent') : t('sendReminder')}
              </button>
            )}
          </div>
        </div>

        {/* ── Hero convert CTA + No-show ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => convertToRental(r)}
            style={{ flex: 1, background: convertBg, color: 'white', border: 'none',
              borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: isT ? '0 2px 10px rgba(249,115,22,0.25)' : isTmr ? '0 2px 10px rgba(202,138,4,0.2)' : '0 2px 10px rgba(99,102,241,0.2)',
            }}>
            <Bike size={14} />{t('convert')} <ArrowRight size={12} />
          </button>
          <button
            onClick={() => { if (window.confirm(t('noShow') + ' ?')) updateStatus(r.id, 'NO_SHOW') }}
            title={t('noShow')}
            style={{ background: 'white', border: '1.5px solid #e9d5ff',
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b21a8', flexShrink: 0 }}>
            <AlertCircle size={16} />
          </button>
          <button onClick={() => setCancelModal({ id: r.id, name: r.customerName })}
            style={{ background: 'white', border: '1.5px solid #fecaca',
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#dc2626', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const calActive = showCal || !!selectedDate

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: 420, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('cancelModalTitle')}</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 3, marginBottom: 0 }}>{cancelModal.name}</p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                {t('cancelReasonLabel')}{' '}
                <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('cancelReasonHint')}</span>
              </label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder={t('cancelReasonPlaceholder')} rows={3} autoFocus
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0',
                  borderRadius: 12, padding: '10px 14px', fontSize: 13, resize: 'none',
                  outline: 'none', color: '#0f172a', fontFamily: 'inherit' }} />
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 12 }}>
              <button onClick={handleCancel}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#ef4444',
                  color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('confirmCancel')}
              </button>
              <button onClick={() => { setCancelModal(null); setCancelReason('') }}
                style={{ padding: '10px 16px', borderRadius: 12, background: 'transparent',
                  border: '1.5px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                {t('back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('editReservation')}</h2>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2, marginBottom: 0 }}>{editModal.customerName}</p>
              </div>
              <button onClick={() => setEditModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', alignItems: 'center', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">{t('start')}</label>
                    <input type="datetime-local" value={editForm.startAt}
                      onChange={e => setEditForm(f => ({ ...f, startAt: e.target.value }))}
                      className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">{t('end')}</label>
                    <input type="datetime-local" value={editForm.endAt}
                      onChange={e => setEditForm(f => ({ ...f, endAt: e.target.value }))}
                      className={INPUT_CLASS} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">{t('bikeOptional')}</label>
                  <select value={editForm.bikeId}
                    onChange={e => setEditForm(f => ({ ...f, bikeId: e.target.value }))}
                    className={INPUT_CLASS}>
                    <option value="">— —</option>
                    {bikes.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">{t('notes')}</label>
                  <textarea value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} className={`${INPUT_CLASS} resize-none`} />
                </div>
              </div>
              <div style={{ padding: '0 24px 24px', display: 'flex', gap: 12 }}>
                <button type="submit" disabled={editSaving}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#6366f1',
                    color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.5 : 1 }}>
                  {editSaving ? t('saving') : t('editReservation')}
                </button>
                <button type="button" onClick={() => setEditModal(null)}
                  style={{ padding: '10px 16px', borderRadius: 12, background: 'transparent',
                    border: '1.5px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                  {t('back')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            {t('title')}
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> {t('new')}
        </button>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: t('sectionToday'),    count: kpiToday,    accent: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
          { label: t('sectionTomorrow'), count: kpiTomorrow, accent: '#ca8a04', bg: '#fefce8', border: '#fef08a' },
          { label: t('kpiWeek'),         count: kpi7d,       accent: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
        ].map(({ label, count, accent, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1.5px solid ${border}`,
            borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: accent, margin: 0, lineHeight: 1 }}>{count}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: accent, margin: '4px 0 0',
              textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.75 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── New reservation form ──────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '20px 20px 24px', marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>

          {/* Section: Client */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0, marginBottom: 12 }}>
            Client
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('customerName')} <span style={{ color: '#f97316' }}>*</span>
              </label>
              <input type="text" required value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Prénom Nom" className={INPUT_CLASS}
                style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {t('phone')}
                </label>
                <input type="tel" value={form.customerPhone}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  placeholder="+33 6 …" className={INPUT_CLASS}
                  style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Email
                </label>
                <input type="email" value={form.customerEmail}
                  onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="client@mail.com" className={INPUT_CLASS}
                  style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 20px' }} />

          {/* Section: Dates */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0, marginBottom: 12 }}>
            Dates
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <DateTimePicker
              value={form.startAt}
              onChange={v => setForm(f => ({ ...f, startAt: v }))}
              label={t('start')}
              locale={locale}
              placeholder="Date et heure de début"
              required
            />
            <DateTimePicker
              value={form.endAt}
              onChange={v => setForm(f => ({ ...f, endAt: v }))}
              label={t('end')}
              locale={locale}
              placeholder="Date et heure de fin"
              required
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 20px' }} />

          {/* Section: Vélo & notes */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0, marginBottom: 12 }}>
            {t('bikeOptional')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Vélo spécifique
              </label>
              <select value={form.bikeId} onChange={e => setForm(f => ({ ...f, bikeId: e.target.value, bikeType: '' }))}
                className={INPUT_CLASS} style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }}>
                <option value="">— Aucun —</option>
                {bikes.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code}) — {Number(b.dailyRate).toFixed(2)} €/j</option>
                ))}
              </select>
            </div>
            {!form.bikeId && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Ou type de vélo
                </label>
                <select value={form.bikeType} onChange={e => setForm(f => ({ ...f, bikeType: e.target.value }))}
                  className={INPUT_CLASS} style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }}>
                  <option value="">— Type quelconque —</option>
                  {Object.entries(BIKE_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('notes')}
              </label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Demandes spéciales, allergies, contexte…"
                className={`${INPUT_CLASS} resize-none`}
                style={{ borderRadius: 12, padding: '11px 14px', fontSize: 13 }} />
            </div>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, marginTop: 0 }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: '#6366F1', color: 'white', border: 'none', borderRadius: 12,
                padding: '12px 0', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: '0 2px 10px rgba(99,102,241,0.25)' }}>
              {saving ? t('saving') : t('new')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '12px 18px', borderRadius: 12, background: 'transparent',
                border: '1.5px solid #e2e8f0', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* ── Search + Calendar toggle ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: (showCal || selectedDate) ? 12 : 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0',
              borderRadius: 12, padding: '10px 36px', fontSize: 13, color: '#0f172a',
              outline: 'none', background: 'white', fontFamily: 'inherit' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setShowCal(s => !s)} title={t('calBtn')}
          style={{ border: `1.5px solid ${calActive ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: 12, padding: '0 14px', flexShrink: 0,
            background: calActive ? '#eef2ff' : 'white',
            color: calActive ? '#6366f1' : '#64748b',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600 }}>
          <CalendarDays size={17} />
          {selectedDate && (
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
            </span>
          )}
        </button>
      </div>

      {/* Selected date chip */}
      {selectedDate && !showCal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '8px 12px' }}>
          <CalendarDays size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', flex: 1 }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </span>
          <button onClick={() => setSelectedDate(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#6366f1', display: 'flex', alignItems: 'center', padding: 0 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Mini calendar */}
      {showCal && renderMiniCalendar()}

      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>
          {t('loading') || 'Loading...'}
        </div>
      ) : (
        <>
          {/* ── DATE FILTER VIEW ─────────────────────────────────────────── */}
          {dateFiltered !== null ? (
            <>
              {dateFiltered.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED').length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {dateFiltered
                    .filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')
                    .map(r => {
                      const v = isToday(r.startAt) ? 'today' : isTomorrow(r.startAt) ? 'tomorrow' : 'upcoming'
                      return renderCard(r, v)
                    })}
                </div>
              ) : (
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 20,
                  padding: '32px 20px', textAlign: 'center', marginBottom: 24 }}>
                  <CalendarDays size={20} style={{ color: '#e2e8f0', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{t('noPending')}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── TODAY ────────────────────────────────────────────────── */}
              {todayPending.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7,
                      background: 'linear-gradient(90deg,#fff7ed,#fffbeb)',
                      border: '1.5px solid #fed7aa', borderRadius: 10, padding: '5px 12px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316',
                        display: 'inline-block', boxShadow: '0 0 0 3px #fed7aa', flexShrink: 0,
                        animation: 'todayPulse 1.8s ease-in-out infinite' }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#c2410c',
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {t('sectionToday')}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fb923c' }}>· {todayPending.length}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {todayPending.map(r => renderCard(r, 'today'))}
                  </div>
                </div>
              )}

              {/* ── TOMORROW ─────────────────────────────────────────────── */}
              {tomorrowPending.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7,
                      background: '#fefce8', border: '1.5px solid #fef08a',
                      borderRadius: 10, padding: '5px 12px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ca8a04',
                        display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#a16207',
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {t('sectionTomorrow')}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#ca8a04' }}>· {tomorrowPending.length}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tomorrowPending.map(r => renderCard(r, 'tomorrow'))}
                  </div>
                </div>
              )}

              {/* ── UPCOMING ─────────────────────────────────────────────── */}
              {laterPending.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  {(todayPending.length > 0 || tomorrowPending.length > 0) && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                      {t('sectionUpcoming')} · {laterPending.length}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {laterPending.map(r => renderCard(r, 'upcoming'))}
                  </div>
                </div>
              )}

              {/* Empty states */}
              {!hasResults && pending.length > 0 && search && (
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 20,
                  padding: '40px 20px', textAlign: 'center', marginBottom: 24 }}>
                  <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>—</p>
                </div>
              )}
              {pending.length === 0 && !search && (
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 20,
                  padding: '40px 20px', textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <CalendarDays size={24} style={{ color: '#e2e8f0' }} />
                  </div>
                  <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{t('noPending')}</p>
                </div>
              )}
            </>
          )}

          {/* ── HISTORY ──────────────────────────────────────────────────── */}
          {past.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                {t('history')}
              </p>
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
                {past.map((r, i) => {
                  const stBadge = STATUS_BADGE[r.status] ?? { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' }
                  const stLabel = tStatus(r.status.toLowerCase() as Parameters<typeof tStatus>[0])
                  return (
                    <div key={r.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', borderTop: i > 0 ? '1px solid #f8fafc' : undefined }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#334155', margin: 0 }}>{r.customerName}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                          {new Date(r.startAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {' → '}
                          {new Date(r.endAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: stBadge.bg, color: stBadge.text, border: `1px solid ${stBadge.border}`,
                        textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {stLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes todayPulse {
          0%,100% { box-shadow: 0 0 0 3px #fed7aa; }
          50%      { box-shadow: 0 0 0 6px #fdba7420; }
        }
        @keyframes availPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        @media screen and (max-width: 767px) {
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  )
}
