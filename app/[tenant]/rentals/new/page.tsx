'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Shield, Lock, BatteryCharging, ShoppingBasket, Heart, Banknote, CreditCard, Smartphone, Building2, Check, Camera, Bike, Zap, Mountain, Package, Flag, Gauge } from 'lucide-react'
import CountrySelect from '../../_components/CountrySelect'

interface Bike { id: string; code: string; name: string; dailyRate: number; hourlyRate: number | null; type: string; status: string }
interface Customer { id: string; firstName: string; lastName: string; phone: string | null }

const FIXED_ACCESSORIES = [
  { type: 'HELMET',     label: 'Casque',       Icon: Shield,         hasCode: false, pricingKey: 'HELMET' },
  { type: 'LOCK',       label: 'Cadenas',      Icon: Lock,           hasCode: true,  pricingKey: null },
  { type: 'CHARGER',    label: 'Chargeur',     Icon: BatteryCharging,hasCode: false, pricingKey: 'CHARGER' },
  { type: 'BASKET',     label: 'Panier',       Icon: ShoppingBasket, hasCode: false, pricingKey: 'BASKET' },
  { type: 'CHILD_SEAT', label: 'Siège enfant', Icon: Heart,          hasCode: false, pricingKey: 'CHILD_SEAT' },
]

const DURATIONS = [
  { key: '1h',    label: '1h',      hours: 1 },
  { key: '2h',    label: '2h',      hours: 2 },
  { key: '4h',    label: '4h',      hours: 4 },
  { key: '1day',  label: '1 jour',  hours: 10 },
  { key: '24h',   label: '24h',     hours: 24 },
  { key: '2days', label: '2 jours', hours: 48 },
  { key: '3days', label: '3 jours', hours: 72 },
  { key: '4days', label: '4 jours', hours: 96 },
  { key: '5days', label: '5 jours', hours: 120 },
  { key: '6days', label: '6 jours', hours: 144 },
  { key: 'week',  label: 'Semaine', hours: 168 },
  { key: 'extra', label: '+1j',     hours: 24 },
]

const TYPE_LABEL: Record<string, string> = {
  CITY: 'Vélo de ville', ELECTRIC: 'Électrique', MOUNTAIN: 'VTT',
  CARGO: 'Cargo', KIDS: 'Enfant', ESCOOTER: 'Trottinette', ROAD: 'Route',
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; headerBg: string; selectedBg: string }> = {
  CITY:     { icon: Bike,     headerBg: 'bg-indigo-50',  selectedBg: 'bg-indigo-500' },
  ELECTRIC: { icon: Zap,      headerBg: 'bg-amber-50',   selectedBg: 'bg-amber-500' },
  MOUNTAIN: { icon: Mountain, headerBg: 'bg-emerald-50', selectedBg: 'bg-emerald-600' },
  ROAD:     { icon: Flag,     headerBg: 'bg-red-50',     selectedBg: 'bg-red-500' },
  CARGO:    { icon: Package,  headerBg: 'bg-purple-50',  selectedBg: 'bg-purple-500' },
  KIDS:     { icon: Heart,    headerBg: 'bg-pink-50',    selectedBg: 'bg-pink-500' },
  ESCOOTER: { icon: Gauge,    headerBg: 'bg-slate-100',  selectedBg: 'bg-slate-600' },
}

const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER']

const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 placeholder-slate-400 transition-colors'

type PricingGrid = Record<string, Record<string, number> | undefined> & {
  accessories?: Record<string, number>
}

export default function NewRentalPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tenant = params.tenant as string
  const [fromReservation, setFromReservation] = useState(false)

  const [step, setStep] = useState(1)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pricingGrid, setPricingGrid] = useState<PricingGrid>({})

  const [accessoryQty, setAccessoryQty] = useState<Record<string, number>>({})
  const [accessoryCodes, setAccessoryCodes] = useState<Record<string, string[]>>({})
  const [selectedDuration, setSelectedDuration] = useState('')
  const [manualPrice, setManualPrice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedBikeIds, setSelectedBikeIds] = useState<string[]>([])

  const [form, setForm] = useState({
    customerId: '',
    expectedReturnAt: '',
    depositAmount: '0',
    depositPaymentMethod: 'CASH',
    amountPaid: '',
    paymentMethod: 'CASH',
    notes: '',
  })

  const [newCustomer, setNewCustomer] = useState(true)
  const [customerForm, setCustomerForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    documentType: 'PASSPORT', documentNumber: '', nationality: '',
    address: '',
  })
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [hasReadTerms, setHasReadTerms] = useState(false)

  useEffect(() => {
    fetch('/api/bikes').then(r => r.json()).then(data => setBikes(data.filter((b: Bike) => b.status === 'AVAILABLE')))
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
    fetch('/api/settings/pricing').then(r => r.json()).then(setPricingGrid).catch(() => {})
  }, [])

  useEffect(() => {
    const reservationId = searchParams.get('reservationId')
    if (!reservationId) return
    fetch(`/api/reservations/${reservationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!res) return
        const [firstName, ...rest] = (res.customerName ?? '').split(' ')
        const lastName = rest.join(' ')
        setCustomerForm(f => ({
          ...f,
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          phone: res.customerPhone ?? '',
          email: res.customerEmail ?? '',
          address: res.customerAddress ?? '',
        }))
        setNewCustomer(true)
        setFromReservation(true)
      })
      .catch(() => {})
  }, [searchParams])

  function initCanvas() {
    setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#6366F1'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }, 50)
  }

  useEffect(() => {
    if (step === 4 && hasReadTerms) initCanvas()
  }, [step, hasReadTerms])

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

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setHasSigned(false)
  }

  const getSignatureData = (): string => canvasRef.current?.toDataURL('image/png') ?? ''

  const selectedBike = bikes.find(b => b.id === selectedBikeIds[0])
  const selectedBikes = useMemo(() => bikes.filter(b => selectedBikeIds.includes(b.id)), [bikes, selectedBikeIds])

  const basePrice = useMemo(() => {
    if (!selectedDuration || selectedBikes.length === 0) return null
    let total = 0
    for (const bike of selectedBikes) {
      const price = pricingGrid[bike.type]?.[selectedDuration]
      if (price === undefined) return null
      total += price
    }
    return total
  }, [selectedDuration, selectedBikes, pricingGrid])

  const accessoriesTotal = useMemo(() => {
    let total = 0
    for (const acc of FIXED_ACCESSORIES) {
      if (!acc.pricingKey) continue
      const qty = accessoryQty[acc.type] ?? 0
      if (qty > 0) {
        const price = pricingGrid.accessories?.[acc.pricingKey] ?? 0
        total += qty * price
      }
    }
    return total
  }, [accessoryQty, pricingGrid])

  const calculatedTotal = useMemo(() => {
    if (basePrice === null) return null
    return basePrice + accessoriesTotal
  }, [basePrice, accessoriesTotal])

  useEffect(() => {
    if (calculatedTotal !== null && !manualPrice) {
      setForm(f => ({ ...f, amountPaid: calculatedTotal.toFixed(2) }))
    }
  }, [calculatedTotal, manualPrice])

  function selectDuration(durKey: string) {
    setSelectedDuration(durKey)
    setManualPrice(false)
    const dur = DURATIONS.find(d => d.key === durKey)
    if (dur) {
      const returnAt = new Date(Date.now() + dur.hours * 3_600_000)
      const pad = (n: number) => String(n).padStart(2, '0')
      const formatted = `${returnAt.getFullYear()}-${pad(returnAt.getMonth() + 1)}-${pad(returnAt.getDate())}T${pad(returnAt.getHours())}:${pad(returnAt.getMinutes())}`
      setForm(f => ({ ...f, expectedReturnAt: formatted }))
    }
  }

  function changeQty(type: string, delta: number, hasCode: boolean) {
    setAccessoryQty(prev => ({ ...prev, [type]: Math.max(0, (prev[type] ?? 0) + delta) }))
    if (hasCode) {
      setAccessoryCodes(prev => {
        const arr = [...(prev[type] ?? [])]
        if (delta > 0) arr.push('')
        else arr.pop()
        return { ...prev, [type]: arr }
      })
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    let customerId = form.customerId
    if (newCustomer) {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customerForm, documentPhoto }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      customerId = data.id
    }

    const accessoriesPayload = FIXED_ACCESSORIES
      .filter(a => (accessoryQty[a.type] ?? 0) > 0)
      .map(a => ({
        type: a.type,
        label: a.label,
        qty: accessoryQty[a.type],
        codes: a.hasCode ? (accessoryCodes[a.type] ?? []) : undefined,
      }))

    const nbBikes = selectedBikeIds.length
    const amountPerBike = nbBikes > 1
      ? (Math.round((parseFloat(form.amountPaid || '0') / nbBikes) * 100) / 100).toFixed(2)
      : form.amountPaid
    const depositPerBike = nbBikes > 1
      ? (Math.round((parseFloat(form.depositAmount || '0') / nbBikes) * 100) / 100).toFixed(2)
      : form.depositAmount

    const results = await Promise.all(
      selectedBikeIds.map(bikeId =>
        fetch('/api/rentals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            bikeId,
            customerId,
            amountPaid: amountPerBike,
            depositAmount: depositPerBike,
            openingSignature: getSignatureData(),
            accessories: accessoriesPayload,
          }),
        }).then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      )
    )

    const failed = results.find(r => !r.ok)
    if (failed) { setError(failed.data.error); setLoading(false); return }

    router.push(`/${tenant}/rentals/${results[0].data.id}/contract`)
  }

  const canNextStep1 = newCustomer ? customerForm.firstName && customerForm.lastName : form.customerId
  const canNextStep2 = selectedBikeIds.length > 0
  const isEscooter = selectedBike?.type === 'ESCOOTER'
  const hasHelmet = (accessoryQty['HELMET'] ?? 0) > 0
  const canNextStep3 = !!form.amountPaid && (!isEscooter || hasHelmet)

  const STEPS = ['Client', 'Vélo', 'Paiement', 'Signature']

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => { if (step > 1) { setStep(step - 1); if (step === 4) { setHasReadTerms(false); setHasSigned(false) } } else { router.back() } }}
          className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
        >
          ← Retour
        </button>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Nouvelle location</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="flex-1 text-center text-xs py-1.5 rounded-full font-semibold transition-all"
            style={{
              background: step === i + 1 ? '#6366F1' : step > i + 1 ? '#ecfdf5' : '#f1f5f9',
              color: step === i + 1 ? 'white' : step > i + 1 ? '#059669' : '#94a3b8',
            }}
          >
            {step > i + 1 ? '✓' : s}
          </div>
        ))}
      </div>

      {/* ─── ÉTAPE 1 — CLIENT ─── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {fromReservation && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700 font-medium flex items-center gap-2">
              <Check size={13} /> Infos pré-remplies depuis la réservation — vérifiez et complétez si besoin
            </div>
          )}
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-900 text-sm">Informations client</h2>
            <button type="button" onClick={() => { setNewCustomer(!newCustomer); setForm(f => ({ ...f, customerId: '' })) }}
              className="text-xs font-semibold hover:underline" style={{ color: '#6366F1' }}>
              {newCustomer ? 'Client existant' : '+ Nouveau client'}
            </button>
          </div>

          {newCustomer ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prénom *</label>
                  <input type="text" required value={customerForm.firstName}
                    onChange={e => setCustomerForm({ ...customerForm, firstName: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom *</label>
                  <input type="text" required value={customerForm.lastName}
                    onChange={e => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Téléphone</label>
                  <input type="tel" value={customerForm.phone}
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                  <input type="email" value={customerForm.email}
                    onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Document</label>
                  <select value={customerForm.documentType}
                    onChange={e => setCustomerForm({ ...customerForm, documentType: e.target.value })}
                    className={INPUT}>
                    <option value="PASSPORT">Passeport</option>
                    <option value="DNI">DNI</option>
                    <option value="NIE">NIE</option>
                    <option value="ID_CARD">Carte d&apos;identité</option>
                    <option value="DRIVING_LICENSE">Permis</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">N° document</label>
                  <input type="text" value={customerForm.documentNumber}
                    onChange={e => setCustomerForm({ ...customerForm, documentNumber: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nationalité</label>
                <CountrySelect
                  value={customerForm.nationality}
                  onChange={v => setCustomerForm({ ...customerForm, nationality: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Adresse / Dirección</label>
                <input type="text" value={customerForm.address}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Rue, ville, pays..." className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Camera size={12} className="text-slate-400" /> Photo pièce d&apos;identité
                </label>
                {documentPhoto ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={documentPhoto} alt="ID" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => setDocumentPhoto(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">✕ Refaire</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    <Camera size={20} className="text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">Appuyer pour photographier</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => setDocumentPhoto(ev.target?.result as string)
                        reader.readAsDataURL(file)
                      }} />
                  </label>
                )}
                {!documentPhoto && <p className="text-xs text-slate-400 mt-1">Recommandé pour preuve légale</p>}
              </div>
            </div>
          ) : (
            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className={INPUT}>
              <option value="">Sélectionner un client...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` — ${c.phone}` : ''}</option>)}
            </select>
          )}

          <button onClick={() => setStep(2)} disabled={!canNextStep1}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{ background: '#6366F1' }}>
            Continuer →
          </button>
        </div>
      )}

      {/* ─── ÉTAPE 2 — VÉLO ─── */}
      {step === 2 && (() => {
        const grouped = TYPE_ORDER
          .map(type => ({ type, items: bikes.filter(b => b.type === type) }))
          .filter(g => g.items.length > 0)
        const otherTypes = [...new Set(bikes.map(b => b.type))].filter(t => !TYPE_ORDER.includes(t))
        otherTypes.forEach(type => grouped.push({ type, items: bikes.filter(b => b.type === type) }))

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-semibold text-slate-900">Choisir un vélo</h2>
              <div className="flex items-center gap-2">
                {selectedBikeIds.length > 0 && (
                  <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: '#6366F1' }}>
                    {selectedBikeIds.length} sélectionné{selectedBikeIds.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {bikes.length} dispo
                </span>
              </div>
            </div>

            {bikes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Bike size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-amber-500 font-medium">Aucun vélo disponible</p>
              </div>
            ) : (
              grouped.map(({ type, items }) => {
                const cfg = TYPE_CONFIG[type] ?? { icon: Bike, headerBg: 'bg-slate-50', selectedBg: 'bg-slate-600' }
                const Icon = cfg.icon
                return (
                  <div key={type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className={`flex items-center gap-2.5 px-4 py-3 ${cfg.headerBg} border-b border-slate-100`}>
                      <Icon size={14} className="text-slate-600" />
                      <span className="text-sm font-semibold text-slate-800">{TYPE_LABEL[type] ?? type}</span>
                      <span className="ml-auto text-xs font-medium text-slate-400">{items.length}</span>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {items.map(bike => {
                        const selected = selectedBikeIds.includes(bike.id)
                        const price = pricingGrid[bike.type]?.['1day'] ?? Number(bike.dailyRate)
                        return (
                          <button
                            key={bike.id}
                            type="button"
                            onClick={() => {
                              setSelectedBikeIds(prev =>
                                prev.includes(bike.id)
                                  ? prev.filter(id => id !== bike.id)
                                  : [...prev, bike.id]
                              )
                              setSelectedDuration('')
                              setManualPrice(false)
                              setForm(f => ({ ...f, amountPaid: '' }))
                            }}
                            className={`flex flex-col items-start px-3 py-2 rounded-xl border-2 transition-all text-left ${
                              selected
                                ? 'border-transparent shadow-sm'
                                : 'border-slate-200 bg-white hover:border-indigo-300'
                            }`}
                            style={selected ? { background: '#6366F1' } : {}}
                          >
                            <span className={`text-sm font-bold leading-tight ${selected ? 'text-white' : 'text-slate-900'}`}>
                              {bike.code}
                            </span>
                            {bike.name !== bike.code && (
                              <span className={`text-xs leading-tight mt-0.5 truncate max-w-[90px] ${selected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {bike.name}
                              </span>
                            )}
                            {price > 0 && (
                              <span className={`text-xs font-semibold mt-1 ${selected ? 'text-indigo-100' : 'text-indigo-500'}`}>
                                {price} €/j
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}

            <button onClick={() => setStep(3)} disabled={!canNextStep2}
              className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: '#6366F1' }}>
              Continuer →
            </button>
          </div>
        )
      })()}

      {/* ─── ÉTAPE 3 — PAIEMENT ─── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h2 className="font-semibold text-slate-900 text-sm">Paiement à l&apos;ouverture</h2>

          {/* Vélos sélectionnés */}
          {selectedBikes.length > 0 && (
            <div className="rounded-xl border border-indigo-100 p-3 space-y-1" style={{ background: '#eef2ff' }}>
              {selectedBikes.map(bike => (
                <div key={bike.id} className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-indigo-900">{bike.name}</p>
                  <p className="text-xs text-indigo-400">{bike.code} · {TYPE_LABEL[bike.type] ?? bike.type}</p>
                </div>
              ))}
              {selectedBikes.length > 1 && (
                <p className="text-xs text-indigo-400 pt-1 border-t border-indigo-200">{selectedBikes.length} vélos — prix cumulé</p>
              )}
            </div>
          )}

          {/* Sélecteur de durée */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Durée de location
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATIONS.map(dur => {
                const price = selectedBikes.length > 0
                  ? selectedBikes.reduce<number | undefined>((acc, bike) => {
                      const p = pricingGrid[bike.type]?.[dur.key]
                      if (p === undefined || acc === undefined) return undefined
                      return acc + p
                    }, 0)
                  : undefined
                const isSelected = selectedDuration === dur.key
                return (
                  <button
                    key={dur.key}
                    type="button"
                    onClick={() => selectDuration(dur.key)}
                    className={`rounded-xl border py-2.5 text-center transition-all ${
                      isSelected
                        ? 'border-transparent text-white'
                        : price !== undefined
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                          : 'border-dashed border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                    style={isSelected ? { background: '#6366F1' } : {}}
                  >
                    <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{dur.label}</p>
                    {price !== undefined ? (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-indigo-500 font-medium'}`}>{price} €</p>
                    ) : (
                      <p className="text-xs mt-0.5 text-slate-300">—</p>
                    )}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => { setSelectedDuration('custom'); setManualPrice(true) }}
                className={`rounded-xl border py-2.5 text-center transition-all ${
                  selectedDuration === 'custom'
                    ? 'border-transparent text-white'
                    : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400'
                }`}
                style={selectedDuration === 'custom' ? { background: '#6366F1' } : {}}
              >
                <p className="text-xs font-semibold">Autre</p>
                <p className="text-xs mt-0.5 text-slate-300">manuel</p>
              </button>
            </div>
          </div>

          {/* Date retour */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Retour prévu</label>
            <input type="datetime-local" value={form.expectedReturnAt}
              onChange={e => setForm({ ...form, expectedReturnAt: e.target.value })}
              className={INPUT} />
          </div>

          {/* Accessoires */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Accessoires remis
              {isEscooter && <span className="ml-2 text-red-500 normal-case font-semibold">— Casque obligatoire</span>}
            </label>
            <div className="space-y-2">
              {FIXED_ACCESSORIES.map(acc => {
                const qty = accessoryQty[acc.type] ?? 0
                const codes = accessoryCodes[acc.type] ?? []
                const accPrice = acc.pricingKey ? (pricingGrid.accessories?.[acc.pricingKey] ?? 0) : 0
                return (
                  <div key={acc.type} className={`rounded-xl border px-3 py-2.5 transition-colors ${qty > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 flex items-center gap-2">
                        <acc.Icon size={13} className={qty > 0 ? 'text-indigo-500' : 'text-slate-400'} />
                        <span className={qty > 0 ? 'font-semibold text-indigo-700' : 'text-slate-600'}>{acc.label}</span>
                        {accPrice > 0 && <span className="text-xs text-slate-400">+{accPrice} €</span>}
                        {!acc.pricingKey && <span className="text-xs text-emerald-600 font-medium">inclus</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => changeQty(acc.type, -1, acc.hasCode)} disabled={qty === 0}
                          className="w-7 h-7 rounded-full border border-slate-200 text-slate-600 text-base font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors">−</button>
                        <span className={`w-5 text-center text-sm font-bold ${qty > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{qty}</span>
                        <button type="button" onClick={() => changeQty(acc.type, 1, acc.hasCode)}
                          className="w-7 h-7 rounded-full border text-sm font-bold flex items-center justify-center transition-colors"
                          style={{ borderColor: '#6366F1', color: '#6366F1' }}>+</button>
                      </div>
                    </div>
                    {qty > 0 && acc.hasCode && (
                      <div className="mt-2 space-y-1.5">
                        {Array.from({ length: qty }).map((_, i) => (
                          <input key={i} type="text" placeholder={`Cadenas${qty > 1 ? ` ${i + 1}` : ''} — N° (optionnel)`}
                            value={codes[i] ?? ''}
                            onChange={e => setAccessoryCodes(prev => {
                              const arr = [...(prev[acc.type] ?? [])]
                              arr[i] = e.target.value
                              return { ...prev, [acc.type]: arr }
                            })}
                            className={INPUT} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {isEscooter && !hasHelmet && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">⚠️ Casque obligatoire pour une trottinette</p>
            )}
          </div>

          {/* Récap prix */}
          {calculatedTotal !== null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-sm">Prix calculé</span>
                <span className="font-bold text-base text-emerald-700">{calculatedTotal.toFixed(2)} €</span>
              </div>
              {accessoriesTotal > 0 && (
                <div className="mt-1 text-xs text-emerald-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Base ({DURATIONS.find(d => d.key === selectedDuration)?.label})</span>
                    <span>{basePrice?.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accessoires</span>
                    <span>+{accessoriesTotal.toFixed(2)} €</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Montant encaissé */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500">Montant encaissé (€) *</label>
              {calculatedTotal !== null && manualPrice && (
                <button type="button" onClick={() => { setManualPrice(false); setForm(f => ({ ...f, amountPaid: calculatedTotal.toFixed(2) })) }}
                  className="text-xs font-semibold hover:underline" style={{ color: '#6366F1' }}>
                  ↩ Remettre {calculatedTotal.toFixed(2)} €
                </button>
              )}
            </div>
            <input type="number" required min="0" step="0.01" value={form.amountPaid}
              onChange={e => { setManualPrice(true); setForm({ ...form, amountPaid: e.target.value }) }}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 transition-colors" />
            {!selectedDuration && !form.amountPaid && (
              <p className="text-xs text-slate-400 mt-1">↑ Sélectionnez une durée pour calculer automatiquement</p>
            )}
          </div>

          {/* Mode paiement */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Mode de paiement</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'CASH',     label: 'Espèces',  Icon: Banknote },
                { value: 'CARD',     label: 'Carte',    Icon: CreditCard },
                { value: 'BIZUM',    label: 'Bizum',    Icon: Smartphone },
                { value: 'TRANSFER', label: 'Virement', Icon: Building2 },
              ].map(pm => (
                <button key={pm.value} type="button" onClick={() => setForm({ ...form, paymentMethod: pm.value })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    form.paymentMethod === pm.value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  <pm.Icon size={12} />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caution */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Caution (€)</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.depositAmount}
                onChange={e => setForm({ ...form, depositAmount: e.target.value })}
                className={`flex-1 ${INPUT}`} />
              <div className="flex gap-1">
                {[
                  { value: 'CASH', label: 'Espèces', Icon: Banknote },
                  { value: 'CARD', label: 'Carte', Icon: CreditCard },
                ].map(pm => (
                  <button key={pm.value} type="button"
                    onClick={() => setForm({ ...form, depositPaymentMethod: pm.value })}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                      form.depositPaymentMethod === pm.value
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    <pm.Icon size={12} /> {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          <button onClick={() => setStep(4)} disabled={!canNextStep3}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{ background: '#6366F1' }}>
            Continuer → Signature
          </button>
        </div>
      )}

      {/* ─── ÉTAPE 4 — SIGNATURE ─── */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Signature du client</h2>

          {/* Récap */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1.5">
            <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">Récapitulatif</p>
            <p className="text-slate-500 text-xs">Client : <span className="text-slate-800 font-medium">
              {newCustomer ? `${customerForm.firstName} ${customerForm.lastName}` : customers.find(c => c.id === form.customerId)?.firstName + ' ' + customers.find(c => c.id === form.customerId)?.lastName}
            </span></p>
            <p className="text-slate-500 text-xs">Vélo{selectedBikeIds.length > 1 ? 's' : ''} : <span className="text-slate-800 font-medium">
              {selectedBikeIds.map(id => {
                const b = bikes.find(x => x.id === id)
                return b ? `${b.name} (${b.code})` : id
              }).join(' · ')}
            </span></p>
            {selectedDuration && selectedDuration !== 'custom' && (
              <p className="text-slate-500 text-xs">Durée : <span className="text-slate-800 font-medium">{DURATIONS.find(d => d.key === selectedDuration)?.label}</span></p>
            )}
            <p className="text-slate-500 text-xs">Payé : <span className="font-bold text-emerald-600">{form.amountPaid} € — {form.paymentMethod}</span></p>
            {Number(form.depositAmount) > 0 && <p className="text-slate-500 text-xs">Caution : <span className="text-slate-800 font-medium">{form.depositAmount} € — {form.depositPaymentMethod === 'CARD' ? 'Carte' : 'Espèces'}</span></p>}
            {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0).length > 0 && (
              <p className="text-slate-500 text-xs">Accessoires : <span className="text-slate-800 font-medium">
                {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0)
                  .map(a => {
                    const codes = accessoryCodes[a.type] ?? []
                    const codeStr = codes.filter(Boolean).length > 0 ? ` (${codes.filter(Boolean).join(', ')})` : ''
                    return `${accessoryQty[a.type]}× ${a.label}${codeStr}`
                  }).join(' · ')}
              </span></p>
            )}
          </div>

          {/* Conditions */}
          {!hasReadTerms ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                📋 Le client doit lire les conditions avant de signer :
              </p>
              <div
                className="border border-slate-200 rounded-xl bg-slate-50 overflow-y-auto text-sm text-slate-700 leading-relaxed"
                style={{ height: '260px', padding: '16px' }}
                onScroll={e => {
                  const el = e.currentTarget
                  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                    setHasReadTerms(true)
                  }
                }}
              >
                <p className="font-bold text-center text-xs uppercase tracking-wide text-slate-400 mb-3">
                  Condiciones generales · General Terms · Conditions générales
                </p>
                <p className="mb-2"><strong>1.</strong> El arrendatario declara haber recibido el material en perfectas condiciones. / <em>The renter declares having received the equipment in perfect working condition.</em> / Le locataire déclare avoir reçu le matériel en parfait état.</p>
                <p className="mb-2"><strong>2.</strong> El arrendatario es el único responsable de la custodia del material durante el alquiler. / <em>The renter is solely responsible for the safekeeping of the equipment throughout the rental period.</em> / Le locataire est seul responsable de la garde du matériel.</p>
                <p className="mb-2"><strong>3.</strong> En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro de reparación o reposición. / <em>In case of theft, loss or damage, the renter shall pay the full cost of repair or replacement.</em> / En cas de vol, perte ou dommage, le locataire paiera le coût total de réparation ou remplacement.</p>
                <p className="mb-2 font-bold text-red-600"><strong>4.</strong> En caso de robo, el arrendatario deberá presentar denuncia policial en un plazo máximo de 24 horas y entregar copia al arrendador. / <em>In case of theft, the renter must file a police report within 24 hours and provide a copy to the rental company.</em> / En cas de vol, le locataire doit déposer plainte auprès de la police dans les 24h et remettre une copie au loueur.</p>
                <p className="mb-2"><strong>5.</strong> La fianza quedará retenida hasta la devolución del material en el mismo estado. / <em>The deposit will be held until the equipment is returned in the same condition.</em> / La caution sera conservée jusqu&apos;à la restitution du matériel dans le même état.</p>
                <p className="mb-2"><strong>6.</strong> El retraso generará cargos adicionales por cada hora o día de retraso. / <em>Late returns will incur additional charges per hour or day of delay.</em> / Tout retard entraînera des frais supplémentaires par heure ou jour.</p>
                <p className="mb-2"><strong>7.</strong> Este contrato tiene plena validez probatoria ante cualquier instancia judicial o administrativa. / <em>This contract has full evidentiary value before any judicial, police or administrative authority.</em> / Ce contrat a pleine valeur probatoire devant toute instance judiciaire ou administrative.</p>
                <p className="mb-2"><strong>8.</strong> Datos personales tratados conforme al RGPD (UE 2016/679). / <em>Personal data processed in accordance with GDPR (EU 2016/679).</em> / Données personnelles traitées conformément au RGPD.</p>
                <p className="mt-4 text-center text-xs text-slate-400">↓ Continuar desplazándose para aceptar · Scroll down to accept · Faites défiler pour accepter ↓</p>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">Faites défiler jusqu&apos;en bas pour débloquer la signature</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <Check size={14} className="text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">Conditions lues — le client peut signer</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500">Le client signe ici :</p>
                <button type="button" onClick={clearSignature} className="text-xs text-red-400 hover:text-red-500 transition-colors">Effacer</button>
              </div>
              <canvas
                ref={canvasRef}
                style={{ touchAction: 'none', width: '100%', height: '160px', border: '2px dashed #e2e8f0', borderRadius: '14px', background: '#f8fafc', cursor: 'crosshair', display: 'block' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              {!hasSigned && <p className="text-xs text-slate-400 text-center mt-1">← Signer avec le doigt ou la souris →</p>}
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading || !hasSigned}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#6366F1' }}>
            {loading ? 'Création...' : <><Check size={15} />Confirmer et ouvrir la location</>}
          </button>
        </div>
      )}
    </div>
  )
}
