'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  '#0d9488','#14b8a6','#f97316','#ec4899',
  '#f59e0b','#0ea5e9','#a855f7','#84cc16',
]
function accentColor(id: string): string {
  let h = 0
  for (const c of id) h = ((h * 31) + c.charCodeAt(0)) & 0x7fffffff
  return ACCENT_COLORS[h % ACCENT_COLORS.length]
}

const STATUS: Record<string, { bg: string; hover: string; border: string; text: string; dot: string }> = {
  ACTIVE:    { bg:'#F0FDFA', hover:'#0d9488', border:'#0d9488', text:'#3730a3', dot:'#0d9488' },
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
  const [hoveredCell, setHoveredCell] = useState<string|null>(null)
  const router = useRouter()

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
            <CalendarDays size={17} style={{ color:'#0d9488' }} />
            <span style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{labels.title}</span>
          </div>
          <button onClick={() => setDayOffset(0)}
            style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:8,
              border:'1.5px solid #0d9488', background:'#F0FDFA', cursor:'pointer', color:'#0d9488' }}>
            {labels.today}
          </button>
        </div>

        {/* Day navigator */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14,
          background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'10px 12px' }}>
          <button onClick={() => setDayOffset(d => d-1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#f8fafc', borderRadius:8,
              padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronLeft size={16} style={{ color:'#0d9488' }} />
          </button>
          <div style={{ flex:1, textAlign:'center' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', textTransform:'capitalize' }}>
              {mobileDayLabel}
            </p>
          </div>
          <button onClick={() => setDayOffset(d => d+1)}
            style={{ border:'1.5px solid #e2e8f0', background:'#f8fafc', borderRadius:8,
              padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <ChevronRight size={16} style={{ color:'#0d9488' }} />
          </button>
        </div>

        {/* KPI strip */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[
            { label:labels.kpiActive,    val:mobileDayStats.active,    c:'#0d9488', bg:'#F0FDFA', bc:'#99F6E4' },
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
          <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'48px 16px', textAlign:'center' }}>
            <div style={{ position:'relative', width:52, height:52, margin:'0 auto 16px' }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(13,148,136,0.06)' }} />
              <div style={{ position:'absolute', inset:6, borderRadius:'50%', background:'rgba(13,148,136,0.1)' }} />
              <div style={{ position:'absolute', inset:13, borderRadius:'50%', background:'rgba(13,148,136,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'#334155', margin:'0 0 4px' }}>{labels.legendAvailable}</p>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>Aucune location ce jour</p>
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
            { label:labels.legendActive,    bg:'#F0FDFA', dot:'#0d9488' },
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#0f172a', letterSpacing:'-0.03em', margin:0, lineHeight:1.2 }}>{labels.title}</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0', fontWeight:400 }}>{weekLabel}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <button onClick={() => setWeekOffset(0)}
            style={{ fontSize:11, fontWeight:600, padding:'6px 12px', borderRadius:8,
              border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', color:'#0d9488',
              transition:'all .15s' }}>
            {labels.today}
          </button>
          <div style={{ display:'flex', alignItems:'center', background:'white', border:'1.5px solid #e2e8f0', borderRadius:9, overflow:'hidden' }}>
            <button onClick={() => setWeekOffset(w => w-1)}
              style={{ border:'none', background:'transparent', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', borderRight:'1px solid #f1f5f9' }}>
              <ChevronLeft size={14} style={{ color:'#0d9488' }} />
            </button>
            <button onClick={() => setWeekOffset(w => w+1)}
              style={{ border:'none', background:'transparent', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <ChevronRight size={14} style={{ color:'#0d9488' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
        {/* EN COURS — dark hero */}
        <div style={{ position:'relative', overflow:'hidden', background:'#0F172A', borderRadius:16, padding:'14px 16px' }}>
          <div style={{ position:'absolute', top:0, right:0, width:60, height:60, background:'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)', transform:'translate(20%,-20%)', pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#0D9488', boxShadow:'0 0 5px #0D9488' }} />
            <p style={{ fontSize:9, fontWeight:700, color:'#5EEAD4', textTransform:'uppercase', letterSpacing:'0.1em' }}>{labels.kpiActive}</p>
          </div>
          <p style={{ fontSize:28, fontWeight:800, color:'white', letterSpacing:'-0.03em', lineHeight:1 }}>{weekStats.active}</p>
          <p style={{ fontSize:10, color:'#475569', marginTop:4 }}>en ce moment</p>
        </div>

        {/* EN RETARD — conditional red */}
        <div style={{
          borderRadius:16, padding:'14px 16px',
          background: weekStats.overdue > 0 ? '#FEF2F2' : 'white',
          border: weekStats.overdue > 0 ? '1.5px solid #FECACA' : '1.5px solid #E2E8F0',
          borderTop: weekStats.overdue > 0 ? '4px solid #EF4444' : '4px solid #E2E8F0',
        }}>
          <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, color: weekStats.overdue > 0 ? '#EF4444' : '#94A3B8' }}>{labels.kpiOverdue}</p>
          <p style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1, color: weekStats.overdue > 0 ? '#EF4444' : '#CBD5E1' }}>{weekStats.overdue}</p>
          <p style={{ fontSize:10, marginTop:4, color: weekStats.overdue > 0 ? '#FCA5A5' : '#94A3B8' }}>retards actifs</p>
        </div>

        {/* DISPONIBLES — white + green border */}
        <div style={{ borderRadius:16, padding:'14px 16px', background:'white', border:'1.5px solid #E2E8F0', borderTop:'4px solid #10B981' }}>
          <p style={{ fontSize:9, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{labels.kpiAvailable}</p>
          <p style={{ fontSize:28, fontWeight:800, color:'#10B981', letterSpacing:'-0.03em', lineHeight:1 }}>{weekStats.available}</p>
          <p style={{ fontSize:10, color:'#94A3B8', marginTop:4 }}>prêts à louer</p>
        </div>
      </div>

      {/* ── Type filter chips ── */}
      <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
        {['ALL', ...allTypes].map(t => {
          const active = typeFilter === t
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                border:`1.5px solid ${active ? '#0d9488' : '#e2e8f0'}`,
                background: active ? '#0d9488' : '#fff',
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
                background: isToday ? 'rgba(13,148,136,0.05)' : 'transparent' }}>
                <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2,
                  color: isToday ? '#0d9488' : '#94a3b8' }}>{dow}</p>
                <div style={{ width:24, height:24, borderRadius:'50%', margin:'0 auto',
                  background: isToday ? '#0d9488' : 'transparent',
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
          <div style={{ padding:'56px 40px', textAlign:'center' }}>
            <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(13,148,136,0.06)' }} />
              <div style={{ position:'absolute', inset:6, borderRadius:'50%', background:'rgba(13,148,136,0.1)' }} />
              <div style={{ position:'absolute', inset:13, borderRadius:'50%', background:'rgba(13,148,136,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
              </div>
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:'#334155', margin:'0 0 6px' }}>{labels.noBikes}</p>
            <p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>Ajoutez des véhicules à votre flotte pour voir le planning</p>
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
                  letterSpacing:'0.08em', color:'#0d9488' }}>
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
                          background: sameDay(d, today) ? 'rgba(13,148,136,0.05)' : 'transparent' }} />
                      ))}
                    </div>

                    {/* Interactive available cells */}
                    <div style={{ position:'absolute', inset:0, display:'flex', zIndex:1 }}>
                      {days.map((d, i) => {
                        const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999)
                        const busy = bikeRentals.some(r => {
                          const rs = new Date(r.startAt), re = new Date(r.endAt)
                          return rs <= dayEnd && re >= d
                        })
                        if (busy) return <div key={i} style={{ flex:1, pointerEvents:'none' }} />
                        const cellKey = `${bike.id}-${i}`
                        const isHov = hoveredCell === cellKey
                        return (
                          <div
                            key={i}
                            style={{
                              flex:1, cursor:'pointer',
                              background: isHov ? 'rgba(16,185,129,0.09)' : 'transparent',
                              transition:'background 0.12s ease',
                              display:'flex', alignItems:'center', justifyContent:'center',
                            }}
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => router.push(`/${tenant}/rentals/new?bikeId=${bike.id}&startDate=${d.toISOString().slice(0,10)}`)}
                            title={`Nouvelle location — ${bike.code}`}
                          >
                            {isHov ? (
                              <div style={{ width:18, height:18, borderRadius:'50%', border:'1.5px dashed rgba(16,185,129,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.85)" strokeWidth="3.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </div>
                            ) : (
                              <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(16,185,129,0.22)' }} />
                            )}
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
          { label:labels.legendActive,    bg:'#F0FDFA', dot:'#0d9488' },
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
          <div style={{ width:16, height:16, borderRadius:'50%', border:'1.5px dashed rgba(16,185,129,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.7)" strokeWidth="3.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{labels.legendAvailable} — cliquez pour créer</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Link2 size={12} style={{ color:'#0d9488' }} />
          <span style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{labels.legendGroup}</span>
        </div>
      </div>

      </div>{/* end desktop wrapper */}
    </div>
  )
}
