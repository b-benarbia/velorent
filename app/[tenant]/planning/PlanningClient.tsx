'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Link2, CalendarDays } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────
type BikeRow = { id: string; code: string; name: string; type: string }
type RentalEvent = {
  id: string; bikeId: string; customerId: string; customerName: string
  status: string; startAt: string; endAt: string
  groupKey: string; groupSize: number
}

// ── Constants ────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  '#6366f1','#14b8a6','#f97316','#ec4899',
  '#f59e0b','#0ea5e9','#a855f7','#84cc16',
]
function accentColor(customerId: string): string {
  let h = 0
  for (const c of customerId) h = ((h * 31) + c.charCodeAt(0)) & 0x7fffffff
  return ACCENT_COLORS[h % ACCENT_COLORS.length]
}

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  ACTIVE:    { bg: '#eef2ff', border: '#6366f1', text: '#3730a3', dot: '#6366f1' },
  OVERDUE:   { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239', dot: '#f43f5e' },
  COMPLETED: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' },
  CANCELLED: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', dot: '#cbd5e1' },
}

const TYPE_LABEL: Record<string, string> = {
  CITY:'City', ELECTRIC:'Electric', MOUNTAIN:'Mountain', ROAD:'Road',
  CARGO:'Cargo', KIDS:'Kids', ESCOOTER:'E-Scooter',
  TANDEM:'Tandem', FATBIKE:'Fat Bike', EMTB:'E-MTB',
}

// ── Date helpers ─────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  return r
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime()-a.getTime())/86400000)
}

// ── Component ────────────────────────────────────────────────────────────
interface Props {
  tenant: string
  bikes: BikeRow[]
  rentals: RentalEvent[]
}

type TooltipData = {
  x: number; y: number
  rental: RentalEvent
}

export default function PlanningClient({ tenant, bikes, rentals }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [weekOffset, setWeekOffset] = useState(0)
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Week days ──────────────────────────────────────────────────────
  const weekStart = useMemo(() => addDays(getMondayOfWeek(today), weekOffset * 7), [today, weekOffset])
  const days = useMemo(() => Array.from({length:7}, (_,i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  // ── Filtered bikes ─────────────────────────────────────────────────
  const visibleBikes = useMemo(() => {
    const types = [...new Set(bikes.map(b => b.type))]
    return typeFilter === 'ALL' ? bikes : bikes.filter(b => b.type === typeFilter)
  }, [bikes, typeFilter])

  const allTypes = useMemo(() => [...new Set(bikes.map(b => b.type))], [bikes])

  // ── Rentals for the visible week, grouped by bike ──────────────────
  const rentalsByBike = useMemo(() => {
    const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999)
    const map = new Map<string, RentalEvent[]>()
    bikes.forEach(b => map.set(b.id, []))
    rentals.forEach(r => {
      const start = new Date(r.startAt)
      const end = new Date(r.endAt)
      if (end < weekStart || start > wEnd) return
      const list = map.get(r.bikeId)
      if (list) list.push(r)
    })
    return map
  }, [bikes, rentals, weekStart, weekEnd])

  // ── Block geometry ────────────────────────────────────────────────
  function getBlockGeometry(rental: RentalEvent) {
    const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999)
    const rStart = new Date(rental.startAt)
    const rEnd = new Date(rental.endAt)

    const clampedStart = rStart < weekStart ? weekStart : rStart
    const clampedEnd   = rEnd   > wEnd      ? wEnd      : rEnd

    const startIdx = Math.round(daysBetween(weekStart, clampedStart))
    const endIdx   = Math.round(daysBetween(weekStart, clampedEnd))

    const fromPrev = rStart < weekStart
    const toNext   = rEnd   > wEnd

    const safeStart = Math.max(0, Math.min(6, startIdx))
    const safeEnd   = Math.max(safeStart, Math.min(6, endIdx))
    const span      = safeEnd - safeStart + 1

    return { startIdx: safeStart, span, fromPrev, toNext }
  }

  // ── KPI counts for the current week ──────────────────────────────
  const weekStats = useMemo(() => {
    const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999)
    let active=0, overdue=0, available=0
    bikes.forEach(b => {
      const hasActive = (rentalsByBike.get(b.id) ?? []).some(r => r.status==='ACTIVE'||r.status==='OVERDUE')
      if (!hasActive) available++
      ;(rentalsByBike.get(b.id) ?? []).forEach(r => {
        if (r.status==='ACTIVE') active++
        if (r.status==='OVERDUE') overdue++
      })
    })
    return { active, overdue, available }
  }, [bikes, rentalsByBike, weekEnd])

  // ── Month label ───────────────────────────────────────────────────
  const weekLabel = useMemo(() => {
    const fmt = (d: Date) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(d)
    const m1 = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(days[0])
    const m2 = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(days[6])
    return m1 === m2
      ? `${fmt(days[0])} – ${days[6].getDate()} ${m1} ${days[0].getFullYear()}`
      : `${fmt(days[0])} – ${fmt(days[6])} ${days[0].getFullYear()}`
  }, [days])

  // ── Tooltip handlers ──────────────────────────────────────────────
  const showTip = useCallback((e: React.MouseEvent, rental: RentalEvent) => {
    setTooltip({ x: e.clientX, y: e.clientY, rental })
    setHoveredGroup(rental.groupKey)
  }, [])
  const hideTip = useCallback(() => { setTooltip(null); setHoveredGroup(null) }, [])

  const LABEL_W = 72
  const ROW_H   = 52
  const HDR_H   = 44

  return (
    <div style={{ fontFamily: 'inherit', paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CalendarDays size={18} style={{ color:'#6366f1' }} />
          <span style={{ fontSize:18, fontWeight:600, color:'var(--color-text-primary, #0f172a)' }}>Planning</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => setWeekOffset(0)}
            style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:8,
              border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', color:'#6366f1' }}>
            Aujourd'hui
          </button>
          <button onClick={() => setWeekOffset(w => w-1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#fff', borderRadius:8,
              padding:'4px 7px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronLeft size={15} style={{ color:'#6366f1' }} />
          </button>
          <span style={{ fontSize:12, fontWeight:600, color:'#1e293b', minWidth:180, textAlign:'center' }}>
            {weekLabel}
          </span>
          <button onClick={() => setWeekOffset(w => w+1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#fff', borderRadius:8,
              padding:'4px 7px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronRight size={15} style={{ color:'#6366f1' }} />
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[
          { label:'En cours',   val:weekStats.active,    c:'#6366f1', bg:'#eef2ff', bc:'#c7d2fe' },
          { label:'En retard',  val:weekStats.overdue,   c:'#f43f5e', bg:'#fff1f2', bc:'#fecdd3' },
          { label:'Disponibles',val:weekStats.available, c:'#16a34a', bg:'#f0fdf4', bc:'#bbf7d0' },
        ].map(k => (
          <div key={k.label} style={{ flex:1, background:k.bg, border:`1px solid ${k.bc}`,
            borderRadius:12, padding:'10px 12px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:k.c, textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:4 }}>{k.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* ── Type filters ── */}
      <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
        {['ALL', ...allTypes].map(t => {
          const active = typeFilter === t
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, fontSize:12,
                fontWeight:600, border:`1.5px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : '#64748b', cursor:'pointer', transition:'all .15s' }}>
              {t === 'ALL' ? 'Tous les vélos' : (TYPE_LABEL[t] ?? t)}
            </button>
          )
        })}
      </div>

      {/* ── Calendar grid ── */}
      <div ref={containerRef}
        style={{ borderRadius:16, border:'1.5px solid #e2e8f0', background:'#fff',
          overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Day header row */}
        <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9', background:'#fafafa' }}>
          {/* Bike label column */}
          <div style={{ width:LABEL_W, flexShrink:0, borderRight:'1px solid #f1f5f9' }} />
          {/* Day headers */}
          {days.map((d, i) => {
            const isToday = sameDay(d, today)
            const dow = new Intl.DateTimeFormat(undefined, { weekday:'short' }).format(d).slice(0,3)
            return (
              <div key={i} style={{ flex:1, textAlign:'center', padding:'6px 2px',
                borderRight: i<6 ? '1px solid #f1f5f9' : 'none',
                background: isToday ? '#f5f3ff' : 'transparent' }}>
                <p style={{ fontSize:10, fontWeight:600, color: isToday ? '#6366f1' : '#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{dow}</p>
                <div style={{
                  width:24, height:24, borderRadius:'50%', margin:'0 auto',
                  background: isToday ? '#6366f1' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <p style={{ fontSize:13, fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : '#1e293b' }}>{d.getDate()}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bike rows */}
        {visibleBikes.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>
            Aucun vélo disponible pour ce filtre
          </div>
        ) : visibleBikes.map((bike, bi) => {
          const bikeRentals = rentalsByBike.get(bike.id) ?? []

          return (
            <div key={bike.id}
              style={{ display:'flex', borderBottom: bi < visibleBikes.length-1 ? '1px solid #f1f5f9' : 'none',
                minHeight:ROW_H }}>

              {/* Bike label */}
              <div style={{ width:LABEL_W, flexShrink:0, padding:'8px 10px',
                borderRight:'1px solid #f1f5f9', background:'#fafafa',
                display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#0f172a', lineHeight:1.2 }}>{bike.code}</p>
                <p style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{TYPE_LABEL[bike.type] ?? bike.type}</p>
              </div>

              {/* Days area */}
              <div style={{ flex:1, position:'relative', minHeight:ROW_H }}>

                {/* Grid lines + today highlight (background layer) */}
                <div style={{ position:'absolute', inset:0, display:'flex', pointerEvents:'none', zIndex:0 }}>
                  {days.map((d, i) => (
                    <div key={i} style={{
                      flex:1, height:'100%',
                      borderRight: i<6 ? '1px solid #f9fafb' : 'none',
                      background: sameDay(d, today) ? '#f5f3ff' : 'transparent',
                    }} />
                  ))}
                </div>

                {/* Available dots (when no rental on a day) */}
                <div style={{ position:'absolute', inset:0, display:'flex', pointerEvents:'none', zIndex:1 }}>
                  {days.map((d, i) => {
                    const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999)
                    const hasRental = bikeRentals.some(r => {
                      const rs = new Date(r.startAt), re = new Date(r.endAt)
                      return rs <= dayEnd && re >= d
                    })
                    return (
                      <div key={i} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {!hasRental && (
                          <div style={{ width:5, height:5, borderRadius:'50%', background:'#d1fae5' }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rental blocks (event layer) */}
                <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none' }}>
                  {bikeRentals.map(rental => {
                    const { startIdx, span, fromPrev, toNext } = getBlockGeometry(rental)
                    const ss = STATUS_STYLE[rental.status] ?? STATUS_STYLE.COMPLETED
                    const accent = accentColor(rental.customerId)
                    const isGrouped = rental.groupSize > 1
                    const isHovered = hoveredGroup === rental.groupKey

                    const leftPct = (startIdx / 7) * 100
                    const widthPct = (span / 7) * 100

                    return (
                      <div key={rental.id}
                        onMouseEnter={e => showTip(e, rental)}
                        onMouseLeave={hideTip}
                        style={{ pointerEvents:'auto' }}>
                        <Link href={`/${tenant}/rentals/${rental.id}`} style={{ textDecoration:'none' }}>
                          <div style={{
                            position:'absolute',
                            top:6, height: ROW_H - 12,
                            left:`calc(${leftPct}% + ${fromPrev ? 0 : 3}px)`,
                            width:`calc(${widthPct}% - ${fromPrev ? 0 : 3}px - ${toNext ? 0 : 3}px)`,
                            background: isHovered ? ss.border : ss.bg,
                            border:`1.5px solid ${isHovered ? ss.border : ss.border}`,
                            borderLeft:`3px solid ${accent}`,
                            borderRadius: `${fromPrev ? 0 : 8}px ${toNext ? 0 : 8}px ${toNext ? 0 : 8}px ${fromPrev ? 0 : 8}px`,
                            display:'flex', alignItems:'center', gap:4, paddingLeft:6, paddingRight:6,
                            overflow:'hidden', cursor:'pointer', transition:'all .12s',
                            boxShadow: isHovered ? `0 2px 8px ${ss.border}40` : 'none',
                          }}>
                            {/* Status dot */}
                            <div style={{
                              width:6, height:6, borderRadius:'50%',
                              background: ss.dot, flexShrink:0,
                              animation: rental.status==='OVERDUE' ? 'pulse 1.5s infinite' : 'none',
                            }} />
                            {/* Customer name */}
                            <span style={{ fontSize:11, fontWeight:600, color: isHovered ? '#fff' : ss.text,
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>
                              {span >= 2 ? rental.customerName : rental.customerName.split(' ')[0]}
                            </span>
                            {/* Group indicator */}
                            {isGrouped && (
                              <Link2 size={10} style={{ color: isHovered ? '#fff' : accent, flexShrink:0 }} />
                            )}
                          </div>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        {[
          { label:'En cours',   bg:'#eef2ff', border:'#6366f1', dot:'#6366f1' },
          { label:'En retard',  bg:'#fff1f2', border:'#f43f5e', dot:'#f43f5e' },
          { label:'Terminé',    bg:'#f1f5f9', border:'#cbd5e1', dot:'#94a3b8' },
          { label:'Disponible', bg:'transparent', border:'transparent', dot:'#d1fae5' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              {l.label === 'Disponible' ? (
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#d1fae5', border:'1px solid #86efac' }} />
              ) : (
                <div style={{ width:28, height:12, borderRadius:4, background:l.bg,
                  border:`1.5px solid ${l.border}`, borderLeft:`3px solid ${l.dot}` }} />
              )}
            </div>
            <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Link2 size={12} style={{ color:'#6366f1' }} />
          <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>Groupe (même client)</span>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (() => {
        const r = tooltip.rental
        const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.COMPLETED
        const accent = accentColor(r.customerId)
        const fmtDate = (s: string) => new Intl.DateTimeFormat(undefined, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(s))
        const statusLabel: Record<string,string> = { ACTIVE:'En cours', OVERDUE:'En retard', COMPLETED:'Terminé', CANCELLED:'Annulé' }
        return (
          <div style={{
            position:'fixed', zIndex:9999, pointerEvents:'none',
            left: Math.min(tooltip.x + 12, window.innerWidth - 210),
            top: tooltip.y - 10,
            background:'#0f172a', borderRadius:12, padding:'10px 14px',
            boxShadow:'0 8px 24px rgba(0,0,0,0.25)', minWidth:190,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:3, height:32, borderRadius:2, background:accent, flexShrink:0 }} />
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:1 }}>{r.customerName}</p>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:6,
                  background: ss.bg, color: ss.text }}>{statusLabel[r.status] ?? r.status}</span>
              </div>
            </div>
            <p style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>
              {fmtDate(r.startAt)}
            </p>
            <p style={{ fontSize:11, color:'#64748b' }}>
              → {fmtDate(r.endAt)}
            </p>
            {r.groupSize > 1 && (
              <div style={{ marginTop:8, padding:'4px 8px', background:'rgba(99,102,241,0.15)',
                borderRadius:6, display:'flex', alignItems:'center', gap:5 }}>
                <Link2 size={11} style={{ color:'#a5b4fc' }} />
                <span style={{ fontSize:11, color:'#a5b4fc', fontWeight:600 }}>Groupe · {r.groupSize} vélos</span>
              </div>
            )}
          </div>
        )
      })()}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1 }
          50% { opacity:0.4 }
        }
      `}</style>
    </div>
  )
}
