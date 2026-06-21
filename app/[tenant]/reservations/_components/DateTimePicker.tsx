'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react'

interface Props {
  value: string          // ISO string or ''
  onChange: (iso: string) => void
  label: string
  locale: string
  placeholder?: string
  required?: boolean
}

// Time slots 07:00 → 21:00 every 30 min
const TIME_SLOTS: string[] = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toNearestSlot(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const slot = m < 45 ? (m < 15 ? 0 : 30) : 0
  const slotH = m >= 45 ? Math.min(h + 1, 21) : h
  const finalH = Math.max(7, Math.min(21, slotH))
  return `${String(finalH).padStart(2, '0')}:${String(slot).padStart(2, '0')}`
}

function todayStr(): string {
  return toDateStr(new Date())
}

export default function DateTimePicker({ value, onChange, label, locale, placeholder, required }: Props) {
  const parsed = value ? (isNaN(new Date(value).getTime()) ? null : new Date(value)) : null

  const [open, setOpen] = useState(false)
  const [selDate, setSelDate] = useState<string>(() => parsed ? toDateStr(parsed) : '')
  const [selTime, setSelTime] = useState<string>(() => parsed ? toNearestSlot(parsed) : '09:00')
  const [calMonth, setCalMonth] = useState(() => {
    const d = parsed ?? new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const timeRef = useRef<HTMLDivElement>(null)

  // Sync if parent value changes (e.g. reset)
  useEffect(() => {
    const d = value ? (isNaN(new Date(value).getTime()) ? null : new Date(value)) : null
    if (d) {
      setSelDate(toDateStr(d))
      setSelTime(toNearestSlot(d))
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() })
    } else if (!value) {
      setSelDate('')
    }
  }, [value])

  // After picking date, scroll page to reveal time section
  // (no inner overflow scroll — time slots display fully)

  function emit(date: string, time: string) {
    if (!date || !time) return
    const [y, mo, d] = date.split('-').map(Number)
    const [h, mi] = time.split(':').map(Number)
    // Local date construction — respects user's timezone
    const dt = new Date(y, mo - 1, d, h, mi, 0, 0)
    onChange(dt.toISOString())
  }

  function pickDate(dk: string) {
    setSelDate(dk)
    emit(dk, selTime)
    // Scroll page to reveal time slots below calendar (mobile UX)
    setTimeout(() => timeRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 100)
  }

  function pickTime(t: string) {
    setSelTime(t)
    emit(selDate, t)
    if (selDate) setOpen(false)   // auto-close once both are set
  }

  // Display string
  const displayVal = parsed
    ? new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(parsed)
    : ''

  // Calendar data
  const { year, month } = calMonth
  const today = todayStr()
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rawLabel    = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  const monthLabel  = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  const dayHdrs     = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i))
  )
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Label */}
      <label style={{
        fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block',
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {label}
        {required && <span style={{ color: '#f97316', marginLeft: 3 }}>*</span>}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', boxSizing: 'border-box',
          background: open ? '#f8faff' : 'white',
          border: `1.5px solid ${open ? '#0d9488' : '#e2e8f0'}`,
          borderRadius: 12, padding: '13px 14px', minHeight: 48,
          color: displayVal ? '#0f172a' : '#94a3b8',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: open ? '0 0 0 3px rgba(13,148,136,0.1)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <CalendarDays size={14} style={{ color: open || displayVal ? '#0d9488' : '#94a3b8', flexShrink: 0 }} />
        <span style={{ flex: 1, fontWeight: displayVal ? 500 : 400 }}>
          {displayVal || placeholder || '—'}
        </span>
        {displayVal && (
          <span style={{
            fontSize: 11, color: '#0d9488', background: '#F0FDFA',
            padding: '2px 8px', borderRadius: 6, fontWeight: 700, flexShrink: 0,
          }}>
            {selTime}
          </span>
        )}
      </button>

      {/* Inline picker */}
      {open && (
        <div style={{
          marginTop: 6, background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}>

          {/* ── Calendar ── */}
          <div style={{ padding: '14px 16px 10px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button type="button" onClick={() => setCalMonth(m => {
                const d = new Date(m.year, m.month - 1)
                return { year: d.getFullYear(), month: d.getMonth() }
              })} style={{ border: '1.5px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={13} style={{ color: '#0d9488' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{monthLabel}</span>
              <button type="button" onClick={() => setCalMonth(m => {
                const d = new Date(m.year, m.month + 1)
                return { year: d.getFullYear(), month: d.getMonth() }
              })} style={{ border: '1.5px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={13} style={{ color: '#0d9488' }} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
              {dayHdrs.map((h, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8',
                  paddingBottom: 4, textTransform: 'uppercase',
                }}>{h}</div>
              ))}
            </div>

            {/* Day grid — 44px min height for Apple touch target compliance */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={i} style={{ minHeight: 44 }} />
                const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSel = selDate === dk
                const isTd  = dk === today
                return (
                  <button key={i} type="button" onClick={() => pickDate(dk)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 44, borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: isSel ? '#0d9488' : isTd ? '#F0FDFA' : 'transparent',
                    fontSize: 13, fontWeight: isSel || isTd ? 700 : 400,
                    color: isSel ? 'white' : isTd ? '#0d9488' : '#334155',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px' }} />

          {/* ── Time slots ── */}
          <div style={{ padding: '12px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Clock size={12} style={{ color: '#0d9488' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Heure
              </span>
              {!selDate && (
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
                  ← sélectionnez d'abord une date
                </span>
              )}
            </div>
            {/* No maxHeight / overflow — all slots visible, no nested scroll on mobile */}
            <div ref={timeRef}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {TIME_SLOTS.map(t => {
                const isSel = selTime === t
                return (
                  <button key={t} type="button"
                    data-time={t}
                    onClick={() => pickTime(t)}
                    disabled={!selDate}
                    style={{
                      padding: '10px 4px', borderRadius: 9,
                      border: `1.5px solid ${isSel ? '#0d9488' : '#e2e8f0'}`,
                      background: isSel ? '#0d9488' : 'white',
                      color: isSel ? 'white' : selDate ? '#334155' : '#c4c9d4',
                      fontSize: 13, fontWeight: isSel ? 700 : 400,
                      cursor: selDate ? 'pointer' : 'default',
                      minHeight: 44,
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
