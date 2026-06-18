'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Check, FileText } from 'lucide-react'

interface Rental {
  id: string; status: string; startAt: string; expectedReturnAt: string | null
  depositAmount: number; amountPaid: number | null; paymentMethod: string; notes: string | null
  bike: { id: string; name: string; code: string; dailyRate: number }
  customer: { id: string; firstName: string; lastName: string; phone: string | null }
}

export default function RentalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenant = params.tenant as string
  const id = params.id as string

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
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (rental?.status === 'ACTIVE') {
      setTimeout(() => {
        for (const ref of [canvasRef, staffCanvasRef]) {
          const canvas = ref.current
          if (!canvas) continue
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          canvas.width = canvas.offsetWidth * window.devicePixelRatio
          canvas.height = canvas.offsetHeight * window.devicePixelRatio
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
          ctx.strokeStyle = '#1e40af'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        }
      }, 100)
    }
  }, [rental])

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawing.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSigned(true)
  }, [])

  const stopDraw = useCallback(() => { isDrawing.current = false }, [])

  const startStaffDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = staffCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isStaffDrawing.current = true
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [])

  const drawStaff = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isStaffDrawing.current) return
    const canvas = staffCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasStaffSigned(true)
  }, [])

  const stopStaffDraw = useCallback(() => { isStaffDrawing.current = false }, [])

  const clearStaffSignature = () => {
    const canvas = staffCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setHasStaffSigned(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setHasSigned(false)
  }

  async function handleReturn() {
    setLoading(true)
    setError('')
    const closingSignature = canvasRef.current?.toDataURL('image/png') ?? ''
    const staffSignature = staffCanvasRef.current?.toDataURL('image/png') ?? ''

    const res = await fetch(`/api/rentals/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closingSignature, staffSignature }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/${tenant}/rentals/${id}/contract`)
  }

  if (!rental) return <div className="text-gray-400 text-sm p-6">Chargement...</div>

  const elapsedMs = now.getTime() - new Date(rental.startAt).getTime()
  const hours = Math.floor(elapsedMs / 3600000)
  const minutes = Math.floor((elapsedMs % 3600000) / 60000)
  const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
  const isOverdue = rental.expectedReturnAt && new Date(rental.expectedReturnAt) < now
  const paymentLabel: Record<string, string> = { CASH: 'Espèces', CARD: 'Carte', BIZUM: 'Bizum', TRANSFER: 'Virement' }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Retour</button>
        <h1 className="text-xl font-bold text-gray-900">Location</h1>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${rental.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {rental.status === 'ACTIVE' ? 'En cours' : 'Clôturée'}
        </span>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Client</p>
            <p className="font-semibold text-gray-900">{rental.customer.firstName} {rental.customer.lastName}</p>
            {rental.customer.phone && <p className="text-gray-500">{rental.customer.phone}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Vélo</p>
            <p className="font-semibold text-gray-900">{rental.bike.name}</p>
            <p className="text-gray-500 font-mono">{rental.bike.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Ouverture</p>
            <p className="text-gray-900">{new Date(rental.startAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Durée</p>
            <p className={`font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{durationLabel} {isOverdue ? <AlertTriangle size={14} /> : ''}</p>
          </div>
          {rental.expectedReturnAt && (
            <div className={`col-span-2 rounded-lg px-3 py-2 ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Retour prévu</p>
              <p className={`font-semibold flex items-center gap-1.5 ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                {isOverdue && <AlertTriangle size={14} />}
                {new Date(rental.expectedReturnAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {isOverdue && <span className="text-xs font-normal ml-1">— EN RETARD</span>}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Payé</p>
            <p className="font-semibold text-green-700">{Number(rental.amountPaid ?? 0).toFixed(2)} € — {paymentLabel[rental.paymentMethod] ?? rental.paymentMethod}</p>
          </div>
          {Number(rental.depositAmount) > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Caution</p>
              <p className="text-gray-900">{Number(rental.depositAmount).toFixed(2)} €</p>
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-2 mb-4">
        <Link href={`/${tenant}/rentals/${id}/contract`} className="flex-1 text-center bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5">
          <FileText size={13} /> Voir le contrat
        </Link>
      </div>

      {/* Return form */}
      {rental.status === 'ACTIVE' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Retour du vélo</h2>

          {/* Client signature */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Signature du client :</p>
              <button type="button" onClick={clearSignature} className="text-xs text-red-500 hover:underline">Effacer</button>
            </div>
            <canvas
              ref={canvasRef}
              style={{ touchAction: 'none', width: '100%', height: '120px', border: '2px dashed #d1d5db', borderRadius: '12px', background: '#fafafa', cursor: 'crosshair', display: 'block' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
            {!hasSigned && <p className="text-xs text-gray-400 text-center mt-1">← Signer avec le doigt →</p>}
          </div>

          {/* Staff signature */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Signature du staff :</p>
              <button type="button" onClick={clearStaffSignature} className="text-xs text-red-500 hover:underline">Effacer</button>
            </div>
            <canvas
              ref={staffCanvasRef}
              style={{ touchAction: 'none', width: '100%', height: '120px', border: '2px dashed #f59e0b', borderRadius: '12px', background: '#fffbeb', cursor: 'crosshair', display: 'block' }}
              onMouseDown={startStaffDraw} onMouseMove={drawStaff} onMouseUp={stopStaffDraw} onMouseLeave={stopStaffDraw}
              onTouchStart={startStaffDraw} onTouchMove={drawStaff} onTouchEnd={stopStaffDraw}
            />
            {!hasStaffSigned && <p className="text-xs text-amber-500 text-center mt-1">← Staff : signer ici →</p>}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <button onClick={handleReturn} disabled={loading || !hasSigned || !hasStaffSigned}
            className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
            {loading ? 'Clôture...' : <><Check size={15} className="inline mr-1.5" />Confirmer le retour</>}
          </button>
        </div>
      )}
    </div>
  )
}
