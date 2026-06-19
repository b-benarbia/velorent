'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Check, FileText, Phone, Bike, Clock, CreditCard, Shield, ArrowLeft, PenLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Rental {
  id: string; status: string; startAt: string; expectedReturnAt: string | null
  depositAmount: number; amountPaid: number | null; paymentMethod: string; notes: string | null
  bike: { id: string; name: string; code: string; dailyRate: number }
  customer: { id: string; firstName: string; lastName: string; phone: string | null }
}

function initCanvas(canvas: HTMLCanvasElement, color: string) {
  canvas.width = canvas.offsetWidth * window.devicePixelRatio
  canvas.height = canvas.offsetHeight * window.devicePixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function getPos(e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
  return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
}

export default function RentalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenant = params.tenant as string
  const id = params.id as string
  const t = useTranslations('rentals')
  const tPayment = useTranslations('payment')

  const [rental, setRental] = useState<Rental | null>(null)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSigned, setHasSigned] = useState(false)
  const [hasStaffSigned, setHasStaffSigned] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staffCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const isStaffDrawing = useRef(false)

  useEffect(() => {
    fetch(`/api/rentals/${id}`).then(r => r.json()).then(setRental)
  }, [id])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (rental?.status === 'ACTIVE') {
      setTimeout(() => {
        if (canvasRef.current) initCanvas(canvasRef.current, '#6366F1')
        if (staffCanvasRef.current) initCanvas(staffCanvasRef.current, '#6366F1')
      }, 100)
    }
  }, [rental])

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    isDrawing.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    setHasSigned(true)
  }, [])

  const stopDraw = useCallback(() => { isDrawing.current = false }, [])

  const startStaffDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = staffCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    isStaffDrawing.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
  }, [])

  const drawStaff = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isStaffDrawing.current) return
    const canvas = staffCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    setHasStaffSigned(true)
  }, [])

  const stopStaffDraw = useCallback(() => { isStaffDrawing.current = false }, [])

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement | null>, setSigned: (v: boolean) => void) => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.offsetWidth * window.devicePixelRatio, canvas.offsetHeight * window.devicePixelRatio)
    setSigned(false)
  }

  async function handleReturn() {
    setLoading(true); setError('')
    const res = await fetch(`/api/rentals/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closingSignature: canvasRef.current?.toDataURL('image/png') ?? '',
        staffSignature: staffCanvasRef.current?.toDataURL('image/png') ?? '',
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/${tenant}/rentals/${id}/contract`)
  }

  if (!rental) return (
    <div className="max-w-lg mx-auto pt-20 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" />
    </div>
  )

  const elapsedMs = now.getTime() - new Date(rental.startAt).getTime()
  const hours = Math.floor(elapsedMs / 3600000)
  const minutes = Math.floor((elapsedMs % 3600000) / 60000)
  const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
  const isOverdue = rental.status === 'ACTIVE' && rental.expectedReturnAt && new Date(rental.expectedReturnAt) < now
  const isActive = rental.status === 'ACTIVE'
  const initials = `${rental.customer.firstName[0]}${rental.customer.lastName[0]}`.toUpperCase()
  const paymentLabel = tPayment(rental.paymentMethod.toLowerCase() as Parameters<typeof tPayment>[0])

  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={15} /> {t('backToList')}
        </button>
        <Link
          href={`/${tenant}/rentals/${id}/contract`}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors bg-white"
        >
          <FileText size={13} /> {t('contract')}
        </Link>
      </div>

      {/* Status banner */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: isOverdue
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
            : isActive
              ? '#0F172A'
              : '#f0fdf4',
          border: isOverdue ? '1px solid #fecaca' : isActive ? 'none' : '1px solid #bbf7d0',
        }}
      >
        {isActive && !isOverdue && <div className="absolute inset-0 grid-pattern pointer-events-none" />}
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: isOverdue ? '#fecaca' : isActive ? 'rgba(99,102,241,0.2)' : '#bbf7d0',
                  color: isOverdue ? '#dc2626' : isActive ? '#a5b4fc' : '#16a34a',
                }}
              >
                {isOverdue ? t('lateLabel') : isActive ? t('activeLabel') : t('closedLabel')}
              </span>
            </div>
            <p
              className="text-3xl font-semibold tracking-tight"
              style={{ color: isOverdue ? '#dc2626' : isActive ? 'white' : '#16a34a' }}
            >
              {isActive ? durationLabel : <Check size={28} className="inline" />}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: isOverdue ? '#ef4444' : isActive ? 'rgba(255,255,255,0.4)' : '#86efac' }}
            >
              {isActive
                ? `${t('startedOn')} ${new Date(rental.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} ${t('at')} ${new Date(rental.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : t('finished')}
            </p>
          </div>
          {isActive && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: isOverdue ? '#fee2e2' : 'rgba(99,102,241,0.2)' }}
            >
              {isOverdue
                ? <AlertTriangle size={22} className="text-red-500" />
                : <Clock size={22} style={{ color: '#a5b4fc' }} />
              }
            </div>
          )}
        </div>

        {/* Expected return */}
        {rental.expectedReturnAt && isActive && (
          <div
            className="relative mt-4 pt-4 flex items-center justify-between"
            style={{ borderTop: isOverdue ? '1px solid #fecaca' : '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-xs" style={{ color: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.35)' }}>
              {t('scheduledReturn')}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: isOverdue ? '#dc2626' : 'rgba(255,255,255,0.7)' }}
            >
              {new Date(rental.expectedReturnAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Customer + Bike */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('client')}</p>
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {rental.customer.firstName} {rental.customer.lastName}
              </p>
            </div>
          </div>
          {rental.customer.phone && (
            <a
              href={`tel:${rental.customer.phone}`}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <Phone size={11} /> {rental.customer.phone}
            </a>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('bike')}</p>
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <Bike size={14} style={{ color: '#6366F1' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{rental.bike.name}</p>
            </div>
          </div>
          <p className="font-mono text-xs text-slate-400">{rental.bike.code}</p>
        </div>
      </div>

      {/* Financial details */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('details')}</p>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <Clock size={13} className="text-slate-300" /> {t('opening')}
            </div>
            <span className="text-sm font-medium text-slate-900">
              {new Date(rental.startAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <CreditCard size={13} className="text-slate-300" /> {t('payment')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#6366F1' }}>
                {Number(rental.amountPaid ?? 0).toFixed(2)} €
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                {paymentLabel}
              </span>
            </div>
          </div>
          {Number(rental.depositAmount) > 0 && (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <Shield size={13} className="text-slate-300" /> {t('caution')}
              </div>
              <span className="text-sm font-semibold text-amber-600">
                {Number(rental.depositAmount).toFixed(2)} €
              </span>
            </div>
          )}
          {rental.notes && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-600">{rental.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Return section */}
      {isActive && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <PenLine size={15} style={{ color: '#6366F1' }} />
            <h2 className="text-sm font-semibold text-slate-900">{t('returnBike')}</h2>
          </div>

          {/* Customer signature */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('customerSig')}</p>
              <button
                type="button"
                onClick={() => clearCanvas(canvasRef, setHasSigned)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                {t('clearSig')}
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden" style={{ border: hasSigned ? '1.5px solid #6366F1' : '1.5px dashed #e2e8f0' }}>
              <canvas
                ref={canvasRef}
                style={{ touchAction: 'none', width: '100%', height: '110px', background: hasSigned ? 'white' : '#fafbff', cursor: 'crosshair', display: 'block' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              {!hasSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-slate-300 font-medium">{t('sigHere')}</p>
                </div>
              )}
            </div>
            {hasSigned && (
              <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
                <Check size={10} /> {t('clientSigSaved')}
              </p>
            )}
          </div>

          {/* Staff signature */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('staffSig')}</p>
              <button
                type="button"
                onClick={() => clearCanvas(staffCanvasRef, setHasStaffSigned)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                {t('clearSig')}
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden" style={{ border: hasStaffSigned ? '1.5px solid #6366F1' : '1.5px dashed #e2e8f0' }}>
              <canvas
                ref={staffCanvasRef}
                style={{ touchAction: 'none', width: '100%', height: '110px', background: hasStaffSigned ? 'white' : '#fafbff', cursor: 'crosshair', display: 'block' }}
                onMouseDown={startStaffDraw} onMouseMove={drawStaff} onMouseUp={stopStaffDraw} onMouseLeave={stopStaffDraw}
                onTouchStart={startStaffDraw} onTouchMove={drawStaff} onTouchEnd={stopStaffDraw}
              />
              {!hasStaffSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-slate-300 font-medium">{t('sigHere')}</p>
                </div>
              )}
            </div>
            {hasStaffSigned && (
              <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
                <Check size={10} /> {t('staffSigSaved')}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleReturn}
            disabled={loading || !hasSigned || !hasStaffSigned}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
              boxShadow: (loading || !hasSigned || !hasStaffSigned) ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            {loading
              ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> {t('closingInProgress')}</>
              : <><Check size={15} /> {t('returnConfirm')}</>
            }
          </button>

          {(!hasSigned || !hasStaffSigned) && (
            <p className="text-center text-xs text-slate-400 mt-2">
              {!hasSigned && !hasStaffSigned ? t('bothSigRequired') : !hasSigned ? t('customerSigMissing') : t('staffSigMissing')}
            </p>
          )}
        </div>
      )}

    </div>
  )
}
