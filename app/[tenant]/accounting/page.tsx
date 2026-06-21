'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Download, TrendingUp, Search, ChevronDown, ChevronUp,
  ChevronsUpDown, X, FileText, FileSpreadsheet, FileCode2,
} from 'lucide-react'
import AnimatedNumber from '../_components/AnimatedNumber'
import { useTranslations } from 'next-intl'

interface Invoice {
  id: string
  number: string
  issuedAt: string
  amountHt: number
  taxRate: number
  amountTtc: number
  currency: string
  rental: {
    id: string
    paymentMethod: string
    customer: { firstName: string; lastName: string }
    bike: { name: string; code: string } | null
    bikes: { bike: { name: string; code: string } }[]
  }
}

const PAYMENT_LABEL_KEY: Record<string, string> = {
  CASH: 'cash', CARD: 'card', BIZUM: 'bizum', TRANSFER: 'transfer',
}

const PAYMENT_COLOR: Record<string, string> = {
  CASH: '#0D9488', CARD: '#2DD4BF', BIZUM: '#5EEAD4', TRANSFER: '#99F6E4',
}

type SortCol = 'date' | 'client' | 'ht' | 'tva' | 'ttc'

// ── FEC helpers ──────────────────────────────────────────────────────────────

function fecDate(d: string) {
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '')
}

function fecAmt(n: number) {
  return n.toFixed(2)
}

/** Compte TVA collectée selon taux */
function tvaAccount(rate: number) {
  const pct = Math.round(rate * 100)
  if (pct >= 20) return ['445711', 'TVA collectée 20%']
  if (pct >= 10) return ['445712', 'TVA collectée 10%']
  if (pct >= 6)  return ['445713', 'TVA collectée 5.5%']
  return ['445714', 'TVA collectée']
}

function payAccount(method: string): [string, string] {
  switch (method) {
    case 'CASH':     return ['531000', 'Caisse']
    case 'CARD':     return ['512100', 'Carte bancaire']
    case 'TRANSFER': return ['512000', 'Banque']
    case 'BIZUM':    return ['512000', 'Banque']
    default:         return ['512000', 'Banque']
  }
}

// ── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  if (data.length === 0) return null

  const max  = Math.max(...data.map(d => d.value), 1)
  const H    = 120
  const SW   = 800
  const barW = Math.min(60, Math.max(16, (SW / data.length) * 0.45))
  const gap  = (SW - data.length * barW) / (data.length + 1)

  return (
    <div style={{ height: 160, overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${SW} ${H + 28}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        {[0, 0.33, 0.66, 1].map((t, i) => (
          <line key={i} x1={0} y1={H * (1 - t)} x2={SW} y2={H * (1 - t)} stroke="rgba(148,163,184,0.15)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x    = gap + i * (barW + gap)
          const barH = Math.max(3, (d.value / max) * (H * 0.85))
          const isH  = hovered === i
          return (
            <g key={i}>
              <rect x={x} y={H - barH} width={barW} height={barH} rx={4}
                fill={isH ? '#2DD4BF' : '#0D9488'} opacity={isH ? 1 : 0.85}
                style={{ transition: 'fill 0.15s, opacity 0.15s' }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              />
              {isH && (
                <text x={x + barW / 2} y={H - barH - 6} textAnchor="middle" fontSize={12} fill="#0D9488" fontWeight="600">
                  {d.value.toFixed(0)}€
                </text>
              )}
              <text x={x + barW / 2} y={H + 20} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const t        = useTranslations('accounting')
  const tPayment = useTranslations('payment')
  const tCommon  = useTranslations('common')

  const [invoices,     setInvoices]     = useState<Invoice[]>([])
  const [loading,      setLoading]      = useState(true)
  const [monthFilter,  setMonthFilter]  = useState('')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [sortCol,      setSortCol]      = useState<SortCol>('date')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc')
  const [showExport,   setShowExport]   = useState(false)
  const [pdfLoading,   setPdfLoading]   = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getPaymentLabel = (method: string) =>
    tPayment((PAYMENT_LABEL_KEY[method] ?? 'cash') as Parameters<typeof tPayment>[0])

  const months = useMemo(() =>
    Array.from(new Set(invoices.map(inv => inv.issuedAt.slice(0, 7)))).sort().reverse()
  , [invoices])

  // Period-filtered (KPIs + charts)
  const filtered = useMemo(() =>
    monthFilter ? invoices.filter(inv => inv.issuedAt.startsWith(monthFilter)) : invoices
  , [invoices, monthFilter])

  // KPI stats
  const totalTtc  = filtered.reduce((s, inv) => s + Number(inv.amountTtc), 0)
  const totalHt   = filtered.reduce((s, inv) => s + Number(inv.amountHt),  0)
  const totalTva  = totalTtc - totalHt
  const avgTtc    = filtered.length > 0 ? totalTtc / filtered.length : 0
  const amounts   = filtered.map(inv => Number(inv.amountTtc)).sort((a, b) => a - b)
  const minTtc    = amounts[0] ?? 0
  const maxTtc    = amounts[amounts.length - 1] ?? 0
  const medianTtc = amounts.length > 0
    ? amounts.length % 2 === 0
      ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : amounts[Math.floor(amounts.length / 2)]
    : 0

  // vs previous month
  const vsLabel = useMemo(() => {
    if (!monthFilter) return null
    const [y, m] = monthFilter.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    const prevKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const prevTotal = invoices
      .filter(inv => inv.issuedAt.startsWith(prevKey))
      .reduce((s, inv) => s + Number(inv.amountTtc), 0)
    if (prevTotal === 0) return null
    const pct = Math.round(((totalTtc - prevTotal) / prevTotal) * 100)
    return { pct, positive: pct >= 0 }
  }, [invoices, monthFilter, totalTtc])

  // Bar chart
  const chartData = useMemo(() => {
    if (monthFilter) {
      const byDay: Record<string, number> = {}
      filtered.forEach(inv => {
        const day = inv.issuedAt.slice(8, 10)
        byDay[day] = (byDay[day] ?? 0) + Number(inv.amountTtc)
      })
      return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
        .map(([day, value]) => ({ label: parseInt(day).toString(), value }))
    } else {
      const byMonth: Record<string, number> = {}
      invoices.forEach(inv => {
        const mo = inv.issuedAt.slice(0, 7)
        byMonth[mo] = (byMonth[mo] ?? 0) + Number(inv.amountTtc)
      })
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
        .map(([mo, value]) => ({
          label: new Date(mo + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
          value,
        }))
    }
  }, [filtered, monthFilter, invoices])

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const byMethod: Record<string, number> = {}
    filtered.forEach(inv => {
      const pm = inv.rental.paymentMethod
      byMethod[pm] = (byMethod[pm] ?? 0) + Number(inv.amountTtc)
    })
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0) || 1
    return Object.entries(byMethod).sort(([, a], [, b]) => b - a)
      .map(([method, amount]) => ({
        method,
        label: tPayment((PAYMENT_LABEL_KEY[method] ?? 'cash') as Parameters<typeof tPayment>[0]),
        amount, pct: Math.round((amount / total) * 100),
        color: PAYMENT_COLOR[method] ?? '#0D9488',
      }))
  }, [filtered, tPayment])

  // Search + sort (table only)
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return filtered
    const q = searchQuery.toLowerCase()
    return filtered.filter(inv =>
      `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`.toLowerCase().includes(q) ||
      inv.number.toLowerCase().includes(q)
    )
  }, [filtered, searchQuery])

  const tableData = useMemo(() => {
    const arr = [...searched]
    arr.sort((a, b) => {
      let va: string | number, vb: string | number
      switch (sortCol) {
        case 'client':
          va = `${a.rental.customer.firstName} ${a.rental.customer.lastName}`.toLowerCase()
          vb = `${b.rental.customer.firstName} ${b.rental.customer.lastName}`.toLowerCase()
          break
        case 'ttc': va = Number(a.amountTtc); vb = Number(b.amountTtc); break
        case 'ht':  va = Number(a.amountHt);  vb = Number(b.amountHt);  break
        case 'tva':
          va = Number(a.amountTtc) - Number(a.amountHt)
          vb = Number(b.amountTtc) - Number(b.amountHt)
          break
        default: va = a.issuedAt; vb = b.issuedAt
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [searched, sortCol, sortDir])

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown size={9} className="inline ml-0.5 opacity-30" />
    return sortDir === 'desc'
      ? <ChevronDown size={9} className="inline ml-0.5" style={{ color: '#0D9488' }} />
      : <ChevronUp   size={9} className="inline ml-0.5" style={{ color: '#0D9488' }} />
  }

  const shopSlug = () =>
    typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'compta'

  // ── Exports ───────────────────────────────────────────────────────────────

  function exportCSV() {
    const rows = [
      ['#', 'Date', 'Client', 'Vélo', 'Code', 'Paiement', 'HT (€)', 'TVA (%)', 'TVA (€)', 'TTC (€)'],
      ...filtered.map(inv => {
        const tvaAmt = Number(inv.amountTtc) - Number(inv.amountHt)
        return [
          inv.number,
          new Date(inv.issuedAt).toLocaleDateString('fr-FR'),
          `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`,
          (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.name ?? '',
          (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.code ?? '',
          getPaymentLabel(inv.rental.paymentMethod),
          Number(inv.amountHt).toFixed(2),
          (Number(inv.taxRate) * 100).toFixed(0),
          tvaAmt.toFixed(2),
          Number(inv.amountTtc).toFixed(2),
        ]
      }),
    ]
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(blob, `${shopSlug()}-compta${monthFilter ? `-${monthFilter}` : ''}.csv`)
    setShowExport(false)
  }

  async function exportXLSX() {
    setShowExport(false)
    const XLSX = await import('xlsx')
    const rows = [
      ['N° Facture', 'Date', 'Client', 'Vélo', 'Code', 'Paiement', 'HT (€)', 'TVA (%)', 'TVA (€)', 'TTC (€)'],
      ...filtered.map(inv => {
        const tvaAmt = Number(inv.amountTtc) - Number(inv.amountHt)
        return [
          inv.number,
          new Date(inv.issuedAt).toLocaleDateString('fr-FR'),
          `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`,
          (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.name ?? '',
          (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.code ?? '',
          getPaymentLabel(inv.rental.paymentMethod),
          Number(inv.amountHt).toFixed(2),
          (Number(inv.taxRate) * 100).toFixed(0) + '%',
          tvaAmt.toFixed(2),
          Number(inv.amountTtc).toFixed(2),
        ]
      }),
      // Totals row
      ['', '', '', '', '', 'TOTAL', totalHt.toFixed(2), '', totalTva.toFixed(2), totalTtc.toFixed(2)],
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 10 },
      { wch: 14 }, { wch: 10 }, { wch: 8  }, { wch: 10 }, { wch: 10 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Factures')
    XLSX.writeFile(wb, `${shopSlug()}-compta${monthFilter ? `-${monthFilter}` : ''}.xlsx`)
  }

  function exportFEC() {
    setShowExport(false)
    // Header columns (official DGFiP FEC format, tab-separated)
    const COLS = [
      'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
      'CompteNum', 'CompteLib', 'CompteAuxNum', 'CompteAuxLib',
      'PieceRef', 'PieceDate', 'EcritureLib',
      'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate',
      'Montantdevise', 'Idevise',
    ]

    const lines: string[] = [COLS.join('\t')]

    function row(fields: (string | number)[]) {
      return fields.map(f => String(f ?? '')).join('\t')
    }

    filtered.forEach(inv => {
      const clientName = `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`
      const clientCode = inv.rental.customer.lastName.slice(0, 8).toUpperCase().replace(/\s/g, '')
      const num        = inv.number
      const dt         = fecDate(inv.issuedAt)
      const piece      = num
      const ht         = fecAmt(Number(inv.amountHt))
      const ttc        = fecAmt(Number(inv.amountTtc))
      const tvaAmt     = fecAmt(Number(inv.amountTtc) - Number(inv.amountHt))
      const [tvaCpt, tvaLib] = tvaAccount(Number(inv.taxRate))
      const [payCpt, payLib] = payAccount(inv.rental.paymentMethod)
      const desc = `Location vélo - ${clientName}`

      // ── Écriture 1 : Vente (Journal VT) ──
      // D 411100 Clients (TTC)
      lines.push(row(['VT', 'Ventes', num, dt, '411100', 'Clients', clientCode, clientName, piece, dt, desc, ttc, '0.00', '', '', dt, '', '']))
      // C 706100 Prestations de services (HT)
      lines.push(row(['VT', 'Ventes', num, dt, '706100', 'Prestations de services - location', '', '', piece, dt, desc, '0.00', ht, '', '', dt, '', '']))
      // C 445711 TVA collectée (if applicable)
      if (Number(inv.amountTtc) > Number(inv.amountHt)) {
        lines.push(row(['VT', 'Ventes', num, dt, tvaCpt, tvaLib, '', '', piece, dt, desc, '0.00', tvaAmt, '', '', dt, '', '']))
      }

      // ── Écriture 2 : Encaissement (Journal BQ/CS) ──
      const jrnCode = inv.rental.paymentMethod === 'CASH' ? 'CS' : 'BQ'
      const jrnLib  = inv.rental.paymentMethod === 'CASH' ? 'Caisse' : 'Banque'
      // D Compte de trésorerie (TTC)
      lines.push(row([jrnCode, jrnLib, num, dt, payCpt, payLib, '', '', piece, dt, desc, ttc, '0.00', '', '', dt, '', '']))
      // C 411100 Clients soldé (TTC)
      lines.push(row([jrnCode, jrnLib, num, dt, '411100', 'Clients', clientCode, clientName, piece, dt, desc, '0.00', ttc, '', '', dt, '', '']))
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' })
    triggerDownload(blob, `${shopSlug()}-FEC${monthFilter ? `-${monthFilter}` : ''}.txt`)
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function openInvoicePDF(invoiceId: string, number: string) {
    setPdfLoading(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      alert(`Erreur lors de la génération du PDF pour la facture ${number}`)
    } finally {
      setPdfLoading(null)
    }
  }

  const monthLabel = monthFilter
    ? new Date(monthFilter + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : t('allPeriod')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>{t('title')}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            {filtered.length} facture{filtered.length !== 1 ? 's' : ''} · {monthLabel}
          </p>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExport(v => !v)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: filtered.length > 0 ? '0 4px 14px rgba(13,148,136,0.35)' : 'none' }}
          >
            <Download size={14} /> Exporter <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>
          {showExport && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-30 overflow-hidden w-52"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 20px rgba(0,0,0,0.08)' }}>
              <button onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <Download size={13} style={{ color: '#0D9488' }} />
                </div>
                <div>
                  <div className="font-medium text-xs">CSV</div>
                  <div className="text-[10px] text-slate-400">Google Sheets, Numbers</div>
                </div>
              </button>
              <div style={{ borderTop: '1px solid #F1F5F9' }} />
              <button onClick={exportXLSX}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <FileSpreadsheet size={13} style={{ color: '#0D9488' }} />
                </div>
                <div>
                  <div className="font-medium text-xs">Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">Microsoft Excel, LibreOffice</div>
                </div>
              </button>
              <div style={{ borderTop: '1px solid #F1F5F9' }} />
              <button onClick={exportFEC}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <FileCode2 size={13} style={{ color: '#0D9488' }} />
                </div>
                <div>
                  <div className="font-medium text-xs">FEC <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>France</span></div>
                  <div className="text-[10px] text-slate-400">Comptabilité · Audit fiscal</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Month pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button onClick={() => setMonthFilter('')}
          className="text-xs font-semibold px-4 py-1.5 rounded-full flex-shrink-0 transition-all"
          style={{ background: !monthFilter ? '#0D9488' : 'white', color: !monthFilter ? '#fff' : '#64748b', border: !monthFilter ? 'none' : '1px solid #e2e8f0' }}>
          {t('allPeriod')}
        </button>
        {months.map(m => {
          const active = monthFilter === m
          return (
            <button key={m} onClick={() => setMonthFilter(m)}
              className="text-xs font-semibold px-4 py-1.5 rounded-full flex-shrink-0 transition-all capitalize"
              style={{ background: active ? '#0D9488' : 'white', color: active ? '#fff' : '#64748b', border: active ? 'none' : '1px solid #e2e8f0' }}>
              {new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">{t('loading') || 'Chargement...'}</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">
            <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: '#0F172A' }}>
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5EEAD4' }}>{t('ttcTotal')}</p>
              <p className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
                <AnimatedNumber value={totalTtc} decimals={2} suffix=" €" duration={800} />
              </p>
              {vsLabel ? (
                <p className="text-[10px] mt-1.5 font-semibold" style={{ color: vsLabel.positive ? '#5EEAD4' : '#F87171' }}>
                  {vsLabel.positive ? '↑' : '↓'} {vsLabel.positive ? '+' : ''}{vsLabel.pct}% vs mois préc.
                </p>
              ) : (
                <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>{monthLabel}</p>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #334155' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('htTotal')}</p>
              <p className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
                <AnimatedNumber value={totalHt} decimals={2} suffix=" €" duration={800} />
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>{t('excludingTax')}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #0D9488' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('taxCollected')}</p>
              <p className="text-2xl font-bold" style={{ color: '#0D9488', letterSpacing: '-0.03em' }}>
                <AnimatedNumber value={totalTva} decimals={2} suffix=" €" duration={800} />
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>{t('taxToReturn')}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #64748B' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('invoices') || 'Factures'}</p>
              <p className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
                <AnimatedNumber value={filtered.length} duration={600} />
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>{t('invoicesCount')}</p>
            </div>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900">
                  {monthFilter ? t('revenueByDay') : t('revenueEvolution')}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <TrendingUp size={12} style={{ color: '#0D9488' }} />
                  <span style={{ color: '#0D9488' }} className="font-medium">{totalTtc.toFixed(0)} €</span>
                  <span>total</span>
                </div>
              </div>
              <BarChart data={chartData} />
            </div>
          )}

          {/* Payment breakdown + Panier moyen */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-900 mb-4">{t('byPaymentMethod')}</p>
                {paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-400">{tCommon('noResults')}</p>
                ) : (
                  <div className="space-y-3">
                    {paymentBreakdown.map(pm => (
                      <div key={pm.method}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 font-medium">{pm.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{pm.amount.toFixed(0)} €</span>
                            <span className="text-xs font-semibold text-slate-700">{pm.pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pm.pct}%`, background: pm.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-900 mb-3">{t('averageBasket')}</p>
                <p className="text-3xl font-semibold tracking-tight mb-1" style={{ color: '#0D9488' }}>
                  <AnimatedNumber value={avgTtc} decimals={2} suffix=" €" duration={700} />
                </p>
                <p className="text-xs text-slate-400 mb-5">{t('perRental')}</p>
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('highest')}</span>
                    <span className="font-semibold text-slate-700">{maxTtc.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('median')}</span>
                    <span className="font-semibold text-slate-700">{medianTtc.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('lowest')}</span>
                    <span className="font-semibold text-slate-700">{minTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl py-16 px-8 text-center" style={{ background: 'white', border: '1.5px solid #E2E8F0' }}>
              <div className="relative w-14 h-14 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(13,148,136,0.06)' }} />
                <div className="absolute inset-[6px] rounded-full" style={{ background: 'rgba(13,148,136,0.1)' }} />
                <div className="absolute inset-[13px] rounded-full flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.18)' }}>
                  <TrendingUp size={13} style={{ color: '#0D9488' }} />
                </div>
              </div>
              <p className="text-[14px] font-semibold mb-1.5" style={{ color: '#334155' }}>{t('noInvoices')}</p>
              <p className="text-[12px]" style={{ color: '#94A3B8' }}>Les factures apparaîtront ici une fois les locations clôturées</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

              {/* Table toolbar */}
              <div className="px-4 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center justify-between flex-1 gap-3">
                  <p className="text-sm font-semibold text-slate-900 flex-shrink-0">{t('invoiceDetail')}</p>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
                    <span>HT : <span className="font-semibold text-slate-700">{totalHt.toFixed(2)} €</span></span>
                    <span>TVA : <span className="font-semibold text-slate-700">{totalTva.toFixed(2)} €</span></span>
                    <span>TTC : <span className="font-semibold" style={{ color: '#0D9488' }}>{totalTtc.toFixed(2)} €</span></span>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher client, N°..."
                    className="text-xs pl-8 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:border-teal-400 w-full sm:w-52 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {searchQuery && (
                <div className="px-4 py-2 border-b text-xs font-medium" style={{ background: '#F0FDFA', borderColor: '#99F6E4', color: '#0D9488' }}>
                  {tableData.length} résultat{tableData.length !== 1 ? 's' : ''} pour « {searchQuery} »
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">#</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left cursor-pointer hover:text-slate-600 select-none"
                        onClick={() => toggleSort('date')}>
                        Date <SortIcon col="date" />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left cursor-pointer hover:text-slate-600 select-none"
                        onClick={() => toggleSort('client')}>
                        Client <SortIcon col="client" />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">Vélo</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">Pay.</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right cursor-pointer hover:text-slate-600 select-none"
                        onClick={() => toggleSort('ht')}>
                        HT <SortIcon col="ht" />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right cursor-pointer hover:text-slate-600 select-none"
                        onClick={() => toggleSort('tva')}>
                        TVA <SortIcon col="tva" />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right cursor-pointer hover:text-slate-600 select-none"
                        onClick={() => toggleSort('ttc')}>
                        TTC <SortIcon col="ttc" />
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-400">Aucun résultat pour « {searchQuery} »</td></tr>
                    ) : tableData.map((inv) => {
                      const tvaAmt  = Number(inv.amountTtc) - Number(inv.amountHt)
                      const loading = pdfLoading === inv.id
                      return (
                        <tr key={inv.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{inv.number}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {new Date(inv.issuedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 text-xs">
                            {inv.rental.customer.firstName} {inv.rental.customer.lastName}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-slate-700">{(inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.name ?? '—'}</span>
                            <span className="text-slate-400 font-mono ml-1 text-[10px]">{(inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.code ?? ''}</span>
                            {(inv.rental.bikes?.length ?? 0) > 1 && <span className="text-slate-400 ml-1 text-[10px]">+{inv.rental.bikes.length - 1}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.08)', color: '#0D9488' }}>
                              {getPaymentLabel(inv.rental.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500">{Number(inv.amountHt).toFixed(2)} €</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">{tvaAmt.toFixed(2)} €</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#0D9488' }}>
                            {Number(inv.amountTtc).toFixed(2)} €
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              onClick={() => openInvoicePDF(inv.id, inv.number)}
                              disabled={loading}
                              title="Télécharger la facture PDF"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                            >
                              {loading
                                ? <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                : <FileText size={14} style={{ color: '#94A3B8' }} />
                              }
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {tableData.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-slate-400">Aucun résultat pour « {searchQuery} »</div>
                ) : tableData.map((inv) => {
                  const bikeName   = (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.name ?? '—'
                  const bikeCode   = (inv.rental.bikes?.[0]?.bike ?? inv.rental.bike)?.code ?? ''
                  const extraBikes = (inv.rental.bikes?.length ?? 0) > 1 ? ` +${inv.rental.bikes.length - 1}` : ''
                  const loading    = pdfLoading === inv.id
                  return (
                    <div key={inv.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {inv.rental.customer.firstName} {inv.rental.customer.lastName}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {bikeName}{extraBikes}
                            {bikeCode && <span className="font-mono ml-1">{bikeCode}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openInvoicePDF(inv.id, inv.number)}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                          >
                            {loading
                              ? <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                              : <FileText size={14} style={{ color: '#94A3B8' }} />
                            }
                          </button>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: '#0D9488' }}>
                              {Number(inv.amountTtc).toFixed(2)} €
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(inv.issuedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.08)', color: '#0D9488' }}>
                          {getPaymentLabel(inv.rental.paymentMethod)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">{inv.number}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
