'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Link2, CalendarDays } from 'lucide-react'
import { useLocale } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────────────
type BikeRow  = { id: string; code: string; name: string; type: string }
type RentalEvent = {
  id: string
  bikeId: string | null      // backward compat (1er vélo ou null)
  bikeIds: string[]          // tous les vélos (nouveau)
  customerId: string; customerName: string
  status: string; startAt: string; endAt: string
  groupKey: string; groupSize: number
}
type PlanningLabels = {
  title: string; today: string
  kpiActive: string; kpiOverdue: string; kpiAvailable: string
  filterAll: string
  statusActive: string; statusOverdue: string; statusCompleted: string; statusCancelled: string
  legendActive: string; legendOverdue: string; legendCompleted: string
  legendAvailable: string; legendGroup: string; groupBikes: string; noBikes: string
}

// ── Palette ──────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  '#6366f1','#14b8a6','#f97316','#ec4899',
  '#f59e0b','#0ea5e9','#a855f7','#84cc16',
]
function accentColor(id: string): string {
  let h = 0
  for (const c of id) h = ((h * 31) + c.charCodeAt(0)) & 0x7fffffff
  return ACCENT_COLORS[h % ACCENT_COLORS.length]
}

const STATUS: Record<string, { bg: string; hover: string; border: string; text: string; dot: string }> = {
  ACTIVE:    { bg:'#eef2ff', hover:'#6366f1', border:'#6366f1', text:'#3730a3', dot:'#6366f1' },
  OVERDUE:   { bg:'#fff1f2', hover:'#f43f5e', border:'#f43f5e', text:'#9f1239', dot:'#f43f5e' },
  COMPLETED: { bg:'#f1f5f9', hover:'#475569', border:'#cbd5e1', text:'#475569', dot:'#94a3b8' },
  CANCELLED: { bg:'#f8fafc', hover:'#94a3b8', border:'#e2e8f0', text:'#94a3b8', dot:'#cbd5e1' },
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
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
// Normalize to local midnight to avoid UTC off-by-one
function localMidnight(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0); return r
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime()-a.getTime())/86400000)
}

// ── Component ────────────────────────────────────────────────────────────
interface Props {
  tenant: string
  bikes: BikeRow[]
  rentals: RentalEvent[]
  labels: PlanningLabels
}

const ROW_H = 44

export default function PlanningClient({ tenant, bikes, rentals, labels }: Props) {
  const locale = useLocale()
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [weekOffset, setWeekOffset] = useState(0)
  const [typeFilter, setTypeFilter]  = useState('ALL')

  // ── Week days ─────────────────────────────────────────────────────
  const weekStart = useMemo(() => addDays(getMondayOfWeek(today), weekOffset * 7), [today, weekOffset])
  const days = useMemo(() => Array.from({length:7}, (_,i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const weekLabel = useMemo(() => {
    const fmt = (d: Date) => new Intl.DateTimeFormat(locale, { day:'numeric', month:'short' }).format(d)
    const m1 = new Intl.DateTimeFormat(locale, { month:'long' }).format(days[0])
    const m2 = new Intl.DateTimeFormat(locale, { month:'long' }).format(days[6])
    return m1 === m2
      ? `${fmt(days[0])} – ${days[6].getDate()} ${m1} ${days[0].getFullYear()}`
      : `${fmt(days[0])} – ${fmt(days[6])} ${days[0].getFullYear()}`
  }, [days])

  // ── Filtered bikes → grouped by type ─────────────────────────────
  const allTypes = useMemo(() => [...new Set(bikes.map(b => b.type))], [bikes])
  const visibleBikes = useMemo(
    () => typeFilter === 'ALL' ? bikes : bikes.filter(b => b.type === typeFilter),
    [bikes, typeFilter]
  )
  // Group consecutive bikes by type (bikes already ordered by type from server)
  const bikeGroups = useMemo(() => {
    const groups: { type: string; bikes: BikeRow[] }[] = []
    visibleBikes.forEach(bike => {
      const last = groups[groups.length - 1]
      if (last && last.type === bike.type) last.bikes.push(bike)
      else groups.push({ type: bike.type, bikes: [bike] })
    })
    return groups
  }, [visibleBikes])

  // ── Rentals per bike for the current week ─────────────────────────
  const rentalsByBike = useMemo(() => {
    const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999)
    const map = new Map<string, RentalEvent[]>()
    bikes.forEach(b => map.set(b.id, []))
    rentals.forEach(r => {
      const start = new Date(r.startAt)
      const end   = new Date(r.endAt)
      if (end < weekStart || start > wEnd) return
      // Utilise bikeIds (multi) ou bikeId (legacy)
      const ids = r.bikeIds.length > 0 ? r.bikeIds : r.bikeId ? [r.bikeId] : []
      ids.forEach(bId => map.get(bId)?.push(r))
    })
    return map
  }, [bikes, rentals, weekStart, weekEnd])

  // ── Block geometry — uses localMidnight to avoid UTC rounding bug ─
  function getBlockGeometry(rental: RentalEvent) {
    const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999)
    const rStart = new Date(rental.startAt)
    const rEnd   = new Date(rental.endAt)

    const clampedStart = rStart < weekStart ? weekStart : rStart
    const clampedEnd   = rEnd   > wEnd      ? wEnd      : rEnd

    // Normalize to local midnight before computing day index
    const startIdx = daysBetween(weekStart, localMidnight(clampedStart))
    const endIdx   = daysBetween(weekStart, localMidnight(clampedEnd))

    const fromPrev = rStart < weekStart
    const toNext   = rEnd   > wEnd

    const safeStart = Math.max(0, Math.min(6, startIdx))
    const safeEnd   = Math.max(safeStart, Math.min(6, endIdx))
    const span      = safeEnd - safeStart + 1

    return { startIdx: safeStart, span, fromPrev, toNext }
  }

  // ── KPI for current week ──────────────────────────────────────────
  const weekStats = useMemo(() => {
    let active=0, overdue=0, available=0
    bikes.forEach(b => {
      const hasOccupied = (rentalsByBike.get(b.id) ?? []).some(
        r => r.status==='ACTIVE' || r.status==='OVERDUE'
      )
      if (!hasOccupied) available++
      ;(rentalsByBike.get(b.id) ?? []).forEach(r => {
        if (r.status==='ACTIVE')  active++
        if (r.status==='OVERDUE') overdue++
      })
    })
    return { active, overdue, available }
  }, [bikes, rentalsByBike])


  // ── Mobile day state ─────────────────────────────────────────────
  const [dayOffset, setDayOffset] = useState(0)
  const mobileDay = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    return d
  }, [today, dayOffset])
  const mobileDayLabel = useMemo(() =>
    new Intl.DateTimeFormat(locale, { weekday:'long', day:'numeric', month:'long' }).format(mobileDay)
  , [mobileDay, locale])

  // Rentals active on mobileDay
  const mobileDayRentals = useMemo(() => {
    const dayEnd = new Date(mobileDay); dayEnd.setHours(23,59,59,999)
    return rentals.filter(r => {
      const rs = new Date(r.startAt), re = new Date(r.endAt)
      return rs <= dayEnd && re >= mobileDay
    })
  }, [rentals, mobileDay])

  // KPI for mobile day
  const mobileDayStats = useMemo(() => {
    let active=0, overdue=0, available=0
    const dayEnd = new Date(mobileDay); dayEnd.setHours(23,59,59,999)
    bikes.forEach(b => {
      const busy = mobileDayRentals.some(r => {
        const ids = r.bikeIds.length > 0 ? r.bikeIds : r.bikeId ? [r.bikeId] : []
        return ids.includes(b.id)
      })
      if (!busy) available++
    })
    mobileDayRentals.forEach(r => {
      if (r.status==='ACTIVE')  active++
      if (r.status==='OVERDUE') overdue++
    })
    return { active, overdue, available }
  }, [bikes, mobileDayRentals, mobileDay])

  return (
    <div style={{ fontFamily:'inherit', paddingBottom:24 }}>

      {/* ── MOBILE VIEW (< md) ── */}
      <div className="md:hidden">
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <CalendarDays size={17} style={{ color:'#6366f1' }} />
            <span style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{labels.title}</span>
          </div>
          <button onClick={() => setDayOffset(0)}
            style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:8,
              border:'1.5px solid #6366f1', background:'#eef2ff', cursor:'pointer', color:'#6366f1' }}>
            {labels.today}
          </button>
        </div>

        {/* Day navigator */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14,
          background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'10px 12px' }}>
          <button onClick={() => setDayOffset(d => d-1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#f8fafc', borderRadius:8,
              padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronLeft size={16} style={{ color:'#6366f1' }} />
          </button>
          <div style={{ flex:1, textAlign:'center' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', textTransform:'capitalize' }}>
              {mobileDayLabel}
            </p>
          </div>
          <button onClick={() => setDayOffset(d => d+1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#f8fafc', borderRadius:8,
              padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronRight size={16} style={{ color:'#6366f1' }} />
          </button>
        </div>

        {/* KPI strip */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[
            { label:labels.kpiActive,    val:mobileDayStats.active,    c:'#6366f1', bg:'#eef2ff', bc:'#c7d2fe' },
            { label:labels.kpiOverdue,   val:mobileDayStats.overdue,   c:'#f43f5e', bg:'#fff1f2', bc:'#fecdd3' },
            { label:labels.kpiAvailable, val:mobileDayStats.available, c:'#16a34a', bg:'#f0fdf4', bc:'#bbf7d0' },
          ].map(k => (
            <div key={k.label} style={{ flex:1, background:k.bg, border:`1px solid ${k.bc}`, borderRadius:12, padding:'10px 10px' }}>
              <p style={{ fontSize:9, fontWeight:700, color:k.c, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{k.label}</p>
              <p style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{k.val}</p>
            </div>
          ))}
        </div>

        {/* Rentals list for the day */}
        {mobileDayRentals.length === 0 ? (
          <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'40px 16px', textAlign:'center' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#d1fae5' }} />
            </div>
            <p style={{ fontSize:14, color:'#94a3b8', fontWeight:500 }}>{labels.legendAvailable}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {mobileDayRentals.map(rental => {
              const ss = STATUS[rental.status] ?? STATUS.COMPLETED
              const accent = accentColor(rental.customerId)
              const startFmt = new Intl.DateTimeFormat(locale, { hour:'2-digit', minute:'2-digit' }).format(new Date(rental.startAt))
              const endFmt   = new Intl.DateTimeFormat(locale, { hour:'2-digit', minute:'2-digit' }).format(new Date(rental.endAt))
              const ids = rental.bikeIds.length > 0 ? rental.bikeIds : rental.bikeId ? [rental.bikeId] : []
              const bikeLabels = ids.map(id => bikes.find(b => b.id === id)?.code ?? id).join(', ')
              return (
                <Link key={rental.id + rental.bikeIds.join('')} href={`/${tenant}/rentals/${rental.id}`}
                  style={{ textDecoration:'none', display:'block' }}>
                  <div style={{
                    background:ss.bg, borderRadius:14,
                    border:`1.5px solid ${ss.border}`,
                    borderLeft:`4px solid ${accent}`,
                    padding:'12px 14px',
                    display:'flex', alignItems:'center', gap:12,
                  }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:ss.dot }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {rental.customerName}
                      </p>
                      <p style={{ fontSize:12, color:'#64748b', fontWeight:500 }}>
                        {bikeLabels} · {startFmt} → {endFmt}
                      </p>
                    </div>
                    {rental.groupSize > 1 && (
                      <Link2 size={12} style={{ color:accent, flexShrink:0 }} />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
          {[
            { label:labels.legendActive,    bg:'#eef2ff', dot:'#6366f1' },
            { label:labels.legendOverdue,   bg:'#fff1f2', dot:'#f43f5e' },
            { label:labels.legendCompleted, bg:'#f1f5f9', dot:'#94a3b8' },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:20, height:10, borderRadius:3, background:l.bg, border:`1.5px solid ${l.dot}`, borderLeft:`3px solid ${l.dot}` }} />
              <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DESKTOP VIEW (≥ md) ── */}
      <div className="hidden md:block">

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CalendarDays size={18} style={{ color:'#6366f1' }} />
          <span style={{ fontSize:18, fontWeight:600, color:'#0f172a' }}>{labels.title}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <button onClick={() => setWeekOffset(0)}
            style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:8,
              border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', color:'#6366f1' }}>
            {labels.today}
          </button>
          <button onClick={() => setWeekOffset(w => w-1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#fff', borderRadius:8,
              padding:'4px 7px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronLeft size={15} style={{ color:'#6366f1' }} />
          </button>
          <span style={{ fontSize:12, fontWeight:600, color:'#1e293b', minWidth:110, textAlign:'center' }}>
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
          { label:labels.kpiActive,    val:weekStats.active,    c:'#6366f1', bg:'#eef2ff', bc:'#c7d2fe' },
          { label:labels.kpiOverdue,   val:weekStats.overdue,   c:'#f43f5e', bg:'#fff1f2', bc:'#fecdd3' },
          { label:labels.kpiAvailable, val:weekStats.available, c:'#16a34a', bg:'#f0fdf4', bc:'#bbf7d0' },
        ].map(k => (
          <div key={k.label} style={{ flex:1, background:k.bg, border:`1px solid ${k.bc}`, borderRadius:12, padding:'10px 12px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:k.c, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* ── Type filter chips ── */}
      <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
        {['ALL', ...allTypes].map(t => {
          const active = typeFilter === t
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                border:`1.5px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : '#64748b', cursor:'pointer', transition:'all .15s' }}>
              {t === 'ALL' ? labels.filterAll : (TYPE_LABEL[t] ?? t)}
            </button>
          )
        })}
      </div>

      {/* ── Calendar grid — scrollable on very small desktop ── */}
      <div style={{ overflowX:'auto', borderRadius:16,
        border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ minWidth:460, background:'#fff', borderRadius:16, overflow:'hidden' }}>

        {/* Day header row */}
        <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9', background:'#fafafa' }}>
          <div style={{ width:72, flexShrink:0, borderRight:'1px solid #f1f5f9' }} />
          {days.map((d, i) => {
            const isToday = sameDay(d, today)
            const dow = new Intl.DateTimeFormat(locale, { weekday:'short' }).format(d).slice(0,3)
            return (
              <div key={i} style={{ flex:1, textAlign:'center', padding:'6px 2px',
                borderRight: i<6 ? '1px solid #f1f5f9' : 'none',
                background: isToday ? '#f5f3ff' : 'transparent' }}>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2,
                  color: isToday ? '#6366f1' : '#94a3b8' }}>{dow}</p>
                <div style={{ width:24, height:24, borderRadius:'50%', margin:'0 auto',
                  background: isToday ? '#6366f1' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <p style={{ fontSize:13, fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : '#1e293b' }}>{d.getDate()}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bike rows — grouped by type ── */}
        {visibleBikes.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>
            {labels.noBikes}
          </div>
        ) : bikeGroups.map((group, gi) => (
          <div key={group.type}>

            {/* ── Category header ── */}
            <div style={{
              display:'flex', borderTop: gi > 0 ? '2px solid #e2e8f0' : 'none',
              borderBottom:'1px solid #e2e8f0', background:'#f8fafc',
            }}>
              <div style={{ width:72, flexShrink:0, padding:'5px 10px', borderRight:'1px solid #e2e8f0',
                display:'flex', alignItems:'center' }}>
                <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.08em', color:'#6366f1' }}>
                  {TYPE_LABEL[group.type] ?? group.type}
                </span>
              </div>
              <div style={{ flex:1, padding:'5px 10px', display:'flex', alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#94a3b8', fontWeight:500 }}>
                  {group.bikes.length} {labels.groupBikes}
                </span>
              </div>
            </div>

            {/* ── Bikes in this group ── */}
            {group.bikes.map((bike, bi) => {
              const bikeRentals = rentalsByBike.get(bike.id) ?? []
              const isLast = gi === bikeGroups.length-1 && bi === group.bikes.length-1
              return (
                <div key={bike.id} style={{ display:'flex',
                  borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                  minHeight:ROW_H }}>

                  {/* Bike label */}
                  <div style={{ width:72, flexShrink:0, padding:'6px 10px', borderRight:'1px solid #f1f5f9',
                    background:'#fafafa', display:'flex', alignItems:'center' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{bike.code}</p>
                  </div>

                  {/* Days area */}
                  <div style={{ flex:1, position:'relative', minHeight:ROW_H }}>

                    {/* Grid bg + today highlight */}
                    <div style={{ position:'absolute', inset:0, display:'flex', pointerEvents:'none' }}>
                      {days.map((d, i) => (
                        <div key={i} style={{ flex:1, height:'100%',
                          borderRight: i<6 ? '1px solid #f9fafb' : 'none',
                          background: sameDay(d, today) ? '#f5f3ff' : 'transparent' }} />
                      ))}
                    </div>

                    {/* Free-slot dots */}
                    <div style={{ position:'absolute', inset:0, display:'flex', pointerEvents:'none', zIndex:1 }}>
                      {days.map((d, i) => {
                        const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999)
                        const busy = bikeRentals.some(r => {
                          const rs = new Date(r.startAt), re = new Date(r.endAt)
                          return rs <= dayEnd && re >= d
                        })
                        return (
                          <div key={i} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {!busy && <div style={{ width:5, height:5, borderRadius:'50%', background:'#d1fae5' }} />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Rental blocks */}
                    <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none' }}>
                      {bikeRentals.map(rental => {
                        const { startIdx, span, fromPrev, toNext } = getBlockGeometry(rental)
                        const ss = STATUS[rental.status] ?? STATUS.COMPLETED
                        const accent = accentColor(rental.customerId)
                        const isGrouped = rental.groupSize > 1
                        const leftPct  = (startIdx / 7) * 100
                        const widthPct = (span / 7) * 100
                        const pad = 3

                        return (
                          <div key={rental.id} style={{ pointerEvents:'auto' }}>
                            <Link href={`/${tenant}/rentals/${rental.id}`} style={{ textDecoration:'none', display:'block' }}>
                              <div style={{
                                position:'absolute',
                                top:5, height: ROW_H - 10,
                                left: `calc(${leftPct}% + ${fromPrev ? 0 : pad}px)`,
                                width:`calc(${widthPct}% - ${fromPrev ? 0 : pad}px - ${toNext ? 0 : pad}px)`,
                                background: ss.bg,
                                border: `1.5px solid ${ss.border}`,
                                borderLeft: `3px solid ${accent}`,
                                borderRadius: `${fromPrev?0:7}px ${toNext?0:7}px ${toNext?0:7}px ${fromPrev?0:7}px`,
                                display:'flex', alignItems:'center', gap:4, paddingLeft:6, paddingRight:6,
                                overflow:'hidden', cursor:'pointer',
                              }}>
                                <div style={{ width:5, height:5, borderRadius:'50%', flexShrink:0, background:ss.dot }} />
                                <span style={{ fontSize:11, fontWeight:600, flex:1,
                                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                                  color: ss.text }}>
                                  {span >= 2 ? rental.customerName : rental.customerName.split(' ')[0]}
                                </span>
                                {isGrouped && (
                                  <Link2 size={10} style={{ color: accent, flexShrink:0 }} />
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
        ))}
      </div>{/* end inner min-width */}
      </div>{/* end scroll wrapper */}

      {/* ── Legend ── */}
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        {[
          { label:labels.legendActive,    bg:'#eef2ff', dot:'#6366f1' },
          { label:labels.legendOverdue,   bg:'#fff1f2', dot:'#f43f5e' },
          { label:labels.legendCompleted, bg:'#f1f5f9', dot:'#94a3b8' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:28, height:12, borderRadius:4, background:l.bg,
              border:`1.5px solid ${l.dot}`, borderLeft:`3px solid ${l.dot}` }} />
            <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#d1fae5', border:'1px solid #86efac' }} />
          <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{labels.legendAvailable}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Link2 size={12} style={{ color:'#6366f1' }} />
          <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{labels.legendGroup}</span>
        </div>
      </div>

      </div>{/* end desktop wrapper */}
    </div>
  )
}
