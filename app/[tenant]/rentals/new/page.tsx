'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Shield, Lock, BatteryCharging, ShoppingBasket, Heart, Banknote, CreditCard, Smartphone, Building2, Check, Camera, Bike, Zap, Mountain, Package, Flag, Gauge } from 'lucide-react'

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
  { key: '1day',  label: '1 jour',  hours: 10 },  // 10h00–20h00
  { key: '24h',   label: '24h',     hours: 24 },
  { key: '2days', label: '2 jours', hours: 48 },
  { key: '3days', label: '3 jours', hours: 72 },
  { key: '4days', label: '4 jours', hours: 96 },
  { key: '5days', label: '5 jours', hours: 120 },
  { key: '6days', label: '6 jours', hours: 144 },
  { key: 'week',  label: 'Semaine', hours: 168 },
  { key: 'extra', label: '+1j',     hours: 24 },  // tarif journalier supplémentaire
]

const TYPE_LABEL: Record<string, string> = {
  CITY: 'Vélo de ville', ELECTRIC: 'Électrique', MOUNTAIN: 'VTT',
  CARGO: 'Cargo', KIDS: 'Enfant', ESCOOTER: 'Trottinette', ROAD: 'Route',
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  CITY:     { icon: Bike,     color: 'bg-blue-50 border-blue-200',   badge: 'text-blue-700 bg-blue-100' },
  ELECTRIC: { icon: Zap,      color: 'bg-yellow-50 border-yellow-200', badge: 'text-yellow-700 bg-yellow-100' },
  MOUNTAIN: { icon: Mountain, color: 'bg-green-50 border-green-200',  badge: 'text-green-700 bg-green-100' },
  ROAD:     { icon: Flag,     color: 'bg-red-50 border-red-200',      badge: 'text-red-700 bg-red-100' },
  CARGO:    { icon: Package,  color: 'bg-purple-50 border-purple-200', badge: 'text-purple-700 bg-purple-100' },
  KIDS:     { icon: Heart,    color: 'bg-pink-50 border-pink-200',    badge: 'text-pink-700 bg-pink-100' },
  ESCOOTER: { icon: Gauge,    color: 'bg-indigo-50 border-indigo-200', badge: 'text-indigo-700 bg-indigo-100' },
}

const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER']

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

  // Pré-remplissage depuis une réservation
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
      ctx.strokeStyle = '#1e40af'
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

  // Pour le pricing on prend le premier vélo sélectionné
  const selectedBike = bikes.find(b => b.id === selectedBikeIds[0])

  // ─── Calcul auto du prix ───────────────────────────────────────────────────
  const selectedBikes = useMemo(() => bikes.filter(b => selectedBikeIds.includes(b.id)), [bikes, selectedBikeIds])

  const basePrice = useMemo(() => {
    if (!selectedDuration || selectedBikes.length === 0) return null
    let total = 0
    for (const bike of selectedBikes) {
      const price = pricingGrid[bike.type]?.[selectedDuration]
      if (price === undefined) return null // si un vélo n'a pas de prix pour cette durée → null
      total += price
    }
    return total
  }, [selectedDuration, selectedBikes, pricingGrid])

  const accessoriesTotal = useMemo(() => {
    let total = 0
    for (const acc of FIXED_ACCESSORIES) {
      if (!acc.pricingKey) continue // cadenas = inclus
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

  // Sync amountPaid when total changes and user didn't manually override
  useEffect(() => {
    if (calculatedTotal !== null && !manualPrice) {
      setForm(f => ({ ...f, amountPaid: calculatedTotal.toFixed(2) }))
    }
  }, [calculatedTotal, manualPrice])

  // ─── Sélection durée ─────────────────────────────────────────────────────
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

  // ─── Soumission ──────────────────────────────────────────────────────────
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

    // Diviser le montant et la caution entre les vélos
    const nbBikes = selectedBikeIds.length
    const amountPerBike = nbBikes > 1
      ? (Math.round((parseFloat(form.amountPaid || '0') / nbBikes) * 100) / 100).toFixed(2)
      : form.amountPaid
    const depositPerBike = nbBikes > 1
      ? (Math.round((parseFloat(form.depositAmount || '0') / nbBikes) * 100) / 100).toFixed(2)
      : form.depositAmount

    // Créer une location par vélo sélectionné
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

    // Rediriger vers le contrat du premier vélo
    router.push(`/${tenant}/rentals/${results[0].data.id}/contract`)
  }

  // ─── Validation ─────────────────────────────────────────────────────────
  const canNextStep1 = newCustomer ? customerForm.firstName && customerForm.lastName : form.customerId
  const canNextStep2 = selectedBikeIds.length > 0
  const isEscooter = selectedBike?.type === 'ESCOOTER'
  const hasHelmet = (accessoryQty['HELMET'] ?? 0) > 0
  const canNextStep3 = !!form.amountPaid && (!isEscooter || hasHelmet)

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { if (step > 1) { setStep(step - 1); if (step === 4) { setHasReadTerms(false); setHasSigned(false) } } else { router.back() } }} className="text-gray-400 hover:text-gray-600 text-sm">← Retour</button>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle location</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {['Client', 'Vélo', 'Paiement', 'Signature'].map((s, i) => (
          <div key={s} className={`flex-1 text-center text-xs py-1.5 rounded-full font-medium transition-colors ${step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {step > i + 1 ? '✓' : s}
          </div>
        ))}
      </div>

      {/* ─── ÉTAPE 1 — CLIENT ─── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {fromReservation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium flex items-center gap-2">
              <Check size={13} /> Infos pré-remplies depuis la réservation — vérifiez et complétez si besoin
            </div>
          )}
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Client</h2>
            <button type="button" onClick={() => { setNewCustomer(!newCustomer); setForm(f => ({ ...f, customerId: '' })) }} className="text-xs text-blue-600 hover:underline">
              {newCustomer ? 'Client existant' : '+ Nouveau client'}
            </button>
          </div>

          {newCustomer ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" required value={customerForm.firstName} onChange={e => setCustomerForm({ ...customerForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" required value={customerForm.lastName} onChange={e => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Document</label>
                  <select value={customerForm.documentType} onChange={e => setCustomerForm({ ...customerForm, documentType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="PASSPORT">Passeport</option>
                    <option value="DNI">DNI</option>
                    <option value="NIE">NIE</option>
                    <option value="ID_CARD">Carte d'identité</option>
                    <option value="DRIVING_LICENSE">Permis</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N° document</label>
                  <input type="text" value={customerForm.documentNumber} onChange={e => setCustomerForm({ ...customerForm, documentNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nationalité</label>
                <input type="text" value={customerForm.nationality} onChange={e => setCustomerForm({ ...customerForm, nationality: e.target.value })}
                  placeholder="FR, ES, DE..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse / Dirección</label>
                <input type="text" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Rue, ville, pays..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Camera size={13} className="text-gray-400" /> Photo pièce d'identité</label>
                {documentPhoto ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={documentPhoto} alt="ID" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setDocumentPhoto(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">✕ Refaire</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Camera size={22} className="text-gray-300 mb-1" />
                    <span className="text-xs text-gray-500">Appuyer pour photographier</span>
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
                {!documentPhoto && <p className="text-xs text-gray-400 mt-1">Recommandé pour preuve légale</p>}
              </div>
            </div>
          ) : (
            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` — ${c.phone}` : ''}</option>)}
            </select>
          )}

          <button onClick={() => setStep(2)} disabled={!canNextStep1}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
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
            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-gray-900">Choisir un vélo</h2>
              <div className="flex items-center gap-2">
                {selectedBikeIds.length > 0 && (
                  <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">
                    {selectedBikeIds.length} sélectionné{selectedBikeIds.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {bikes.length} dispo
                </span>
              </div>
            </div>

            {bikes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <Bike size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-orange-500 font-medium">Aucun vélo disponible</p>
              </div>
            ) : (
              grouped.map(({ type, items }) => {
                const cfg = TYPE_CONFIG[type] ?? { icon: Bike, color: 'bg-gray-50 border-gray-200', badge: 'text-gray-600 bg-gray-100' }
                const Icon = cfg.icon
                return (
                  <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* En-tête catégorie */}
                    <div className={`flex items-center gap-2.5 px-4 py-3 ${cfg.color} border-b border-black border-opacity-5`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.badge}`}>
                        <Icon size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{TYPE_LABEL[type] ?? type}</span>
                      <span className="ml-auto text-xs font-semibold text-gray-500">{items.length} vélo{items.length > 1 ? 's' : ''}</span>
                    </div>

                    {/* Grille de chips */}
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
                                ? 'border-blue-500 bg-blue-600 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <span className={`text-sm font-bold leading-tight ${selected ? 'text-white' : 'text-gray-900'}`}>
                              {bike.code}
                            </span>
                            {bike.name !== bike.code && (
                              <span className={`text-xs leading-tight mt-0.5 truncate max-w-[90px] ${selected ? 'text-blue-200' : 'text-gray-400'}`}>
                                {bike.name}
                              </span>
                            )}
                            {price > 0 && (
                              <span className={`text-xs font-semibold mt-1 ${selected ? 'text-blue-100' : 'text-blue-600'}`}>
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
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm">
              Continuer →
            </button>
          </div>
        )
      })()}

      {/* ─── ÉTAPE 3 — PAIEMENT ─── */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Paiement à l'ouverture</h2>

          {/* Vélos sélectionnés */}
          {selectedBikes.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
              {selectedBikes.map(bike => (
                <div key={bike.id} className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-900">{bike.name}</p>
                  <p className="text-xs text-blue-500">{bike.code} · {TYPE_LABEL[bike.type] ?? bike.type}</p>
                </div>
              ))}
              {selectedBikes.length > 1 && (
                <p className="text-xs text-blue-400 pt-1 border-t border-blue-200">{selectedBikes.length} vélos — prix cumulé</p>
              )}
            </div>
          )}

          {/* ── Sélecteur de durée ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Durée de location
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(dur => {
                // Somme du prix pour cette durée sur tous les vélos sélectionnés
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
                    className={`rounded-lg border py-2.5 text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                        : price !== undefined
                          ? 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{dur.label}</p>
                    {price !== undefined ? (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-blue-600 font-medium'}`}>{price} €</p>
                    ) : (
                      <p className="text-xs mt-0.5 text-gray-300">—</p>
                    )}
                  </button>
                )
              })}
              {/* Bouton "Autre" pour durée manuelle */}
              <button
                type="button"
                onClick={() => { setSelectedDuration('custom'); setManualPrice(true) }}
                className={`rounded-lg border py-2.5 text-center transition-all ${
                  selectedDuration === 'custom'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400'
                }`}
              >
                <p className="text-xs font-semibold">Autre</p>
                <p className="text-xs mt-0.5 text-gray-300">manuel</p>
              </button>
            </div>
          </div>

          {/* Date retour (auto-remplie ou manuelle) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Retour prévu</label>
            <input type="datetime-local" value={form.expectedReturnAt}
              onChange={e => setForm({ ...form, expectedReturnAt: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* ── Accessoires ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Accessoires remis
              {isEscooter && <span className="ml-2 text-red-500 font-semibold normal-case flex items-center gap-1 inline-flex">— Casque obligatoire <Shield size={12} /></span>}
            </label>
            <div className="space-y-2">
              {FIXED_ACCESSORIES.map(acc => {
                const qty = accessoryQty[acc.type] ?? 0
                const codes = accessoryCodes[acc.type] ?? []
                const accPrice = acc.pricingKey ? (pricingGrid.accessories?.[acc.pricingKey] ?? 0) : 0
                return (
                  <div key={acc.type} className={`rounded-lg border px-3 py-2.5 transition-colors ${qty > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 flex items-center gap-2">
                        <acc.Icon size={14} className={qty > 0 ? 'text-blue-500' : 'text-gray-400'} />
                        <span className={qty > 0 ? 'font-semibold text-blue-700' : ''}>{acc.label}</span>
                        {accPrice > 0 && <span className="text-xs text-gray-400">+{accPrice} €/unité</span>}
                        {!acc.pricingKey && <span className="text-xs text-green-600">inclus</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => changeQty(acc.type, -1, acc.hasCode)} disabled={qty === 0}
                          className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 text-lg font-bold flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">−</button>
                        <span className={`w-5 text-center text-sm font-bold ${qty > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{qty}</span>
                        <button type="button" onClick={() => changeQty(acc.type, 1, acc.hasCode)}
                          className="w-7 h-7 rounded-full border border-blue-400 text-blue-600 text-lg font-bold flex items-center justify-center hover:bg-blue-50">+</button>
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {isEscooter && !hasHelmet && (
              <p className="text-xs text-red-500 mt-1.5">⚠️ Casque obligatoire pour une trottinette</p>
            )}
          </div>

          {/* ── Récap prix calculé ── */}
          {calculatedTotal !== null && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between text-green-800">
                <span>Prix calculé</span>
                <span className="font-bold text-base text-green-700">{calculatedTotal.toFixed(2)} €</span>
              </div>
              {accessoriesTotal > 0 && (
                <div className="mt-1 text-xs text-green-600 space-y-0.5">
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

          {/* ── Montant à encaisser ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">Montant encaissé (€) *</label>
              {calculatedTotal !== null && manualPrice && (
                <button type="button" onClick={() => { setManualPrice(false); setForm(f => ({ ...f, amountPaid: calculatedTotal.toFixed(2) })) }}
                  className="text-xs text-blue-600 hover:underline">
                  ↩ Remettre {calculatedTotal.toFixed(2)} €
                </button>
              )}
            </div>
            <input type="number" required min="0" step="0.01" value={form.amountPaid}
              onChange={e => { setManualPrice(true); setForm({ ...form, amountPaid: e.target.value }) }}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {!selectedDuration && !form.amountPaid && (
              <p className="text-xs text-gray-400 mt-1">↑ Sélectionnez une durée pour calculer automatiquement</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Mode de paiement</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'CASH',     label: 'Espèces',  Icon: Banknote },
                { value: 'CARD',     label: 'Carte',    Icon: CreditCard },
                { value: 'BIZUM',    label: 'Bizum',    Icon: Smartphone },
                { value: 'TRANSFER', label: 'Virement', Icon: Building2 },
              ].map(pm => (
                <button key={pm.value} type="button" onClick={() => setForm({ ...form, paymentMethod: pm.value })}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${form.paymentMethod === pm.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <pm.Icon size={13} />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Caution (€)</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.depositAmount}
                onChange={e => setForm({ ...form, depositAmount: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-1">
                {[
                  { value: 'CASH', label: 'Espèces', Icon: Banknote },
                  { value: 'CARD', label: 'Carte', Icon: CreditCard },
                ].map(pm => (
                  <button key={pm.value} type="button"
                    onClick={() => setForm({ ...form, depositPaymentMethod: pm.value })}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.depositPaymentMethod === pm.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <pm.Icon size={13} /> {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button onClick={() => setStep(4)} disabled={!canNextStep3}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
            Continuer → Signature
          </button>
        </div>
      )}

      {/* ─── ÉTAPE 4 — SIGNATURE ─── */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Signature du client</h2>

          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium text-gray-900">Récapitulatif</p>
            <p className="text-gray-600">Client : <span className="text-gray-900">
              {newCustomer ? `${customerForm.firstName} ${customerForm.lastName}` : customers.find(c => c.id === form.customerId)?.firstName + ' ' + customers.find(c => c.id === form.customerId)?.lastName}
            </span></p>
            <p className="text-gray-600">Vélo{selectedBikeIds.length > 1 ? 's' : ''} : <span className="text-gray-900">
              {selectedBikeIds.map(id => {
                const b = bikes.find(x => x.id === id)
                return b ? `${b.name} (${b.code})` : id
              }).join(' · ')}
            </span></p>
            {selectedDuration && selectedDuration !== 'custom' && (
              <p className="text-gray-600">Durée : <span className="text-gray-900">{DURATIONS.find(d => d.key === selectedDuration)?.label}</span></p>
            )}
            <p className="text-gray-600">Payé : <span className="font-semibold text-green-700">{form.amountPaid} € — {form.paymentMethod}</span></p>
            {Number(form.depositAmount) > 0 && <p className="text-gray-600">Caution : <span className="text-gray-900">{form.depositAmount} € — {form.depositPaymentMethod === 'CARD' ? 'Carte' : 'Espèces'}</span></p>}
            {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0).length > 0 && (
              <p className="text-gray-600">Accessoires : <span className="text-gray-900">
                {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0)
                  .map(a => {
                    const codes = accessoryCodes[a.type] ?? []
                    const codeStr = codes.filter(Boolean).length > 0 ? ` (${codes.filter(Boolean).join(', ')})` : ''
                    return `${a.icon} ${accessoryQty[a.type]}× ${a.label}${codeStr}`
                  }).join(' · ')}
              </span></p>
            )}
          </div>

          {/* ── CONDITIONS À LIRE ── */}
          {!hasReadTerms ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                📋 Le client doit lire les conditions avant de signer :
              </p>
              <div
                className="border-2 border-gray-200 rounded-xl bg-gray-50 overflow-y-auto text-sm text-gray-800 leading-relaxed"
                style={{ height: '260px', padding: '16px' }}
                onScroll={e => {
                  const el = e.currentTarget
                  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                    setHasReadTerms(true)
                  }
                }}
              >
                <p className="font-bold text-center text-xs uppercase tracking-wide text-gray-500 mb-3">
                  Condiciones generales · General Terms · Conditions générales
                </p>
                <p className="mb-2"><strong>1.</strong> El arrendatario declara haber recibido el material en perfectas condiciones. / <em>The renter declares having received the equipment in perfect working condition.</em> / Le locataire déclare avoir reçu le matériel en parfait état.</p>
                <p className="mb-2"><strong>2.</strong> El arrendatario es el único responsable de la custodia del material durante el alquiler. / <em>The renter is solely responsible for the safekeeping of the equipment throughout the rental period.</em> / Le locataire est seul responsable de la garde du matériel.</p>
                <p className="mb-2"><strong>3.</strong> En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro de reparación o reposición. / <em>In case of theft, loss or damage, the renter shall pay the full cost of repair or replacement.</em> / En cas de vol, perte ou dommage, le locataire paiera le coût total de réparation ou remplacement.</p>
                <p className="mb-2 font-bold text-red-600"><strong>4.</strong> En caso de robo, el arrendatario deberá presentar denuncia policial en un plazo máximo de 24 horas y entregar copia al arrendador. / <em>In case of theft, the renter must file a police report within 24 hours and provide a copy to the rental company.</em> / En cas de vol, le locataire doit déposer plainte auprès de la police dans les 24h et remettre une copie au loueur.</p>
                <p className="mb-2"><strong>5.</strong> La fianza quedará retenida hasta la devolución del material en el mismo estado. / <em>The deposit will be held until the equipment is returned in the same condition.</em> / La caution sera conservée jusqu'à la restitution du matériel dans le même état.</p>
                <p className="mb-2"><strong>6.</strong> El retraso generará cargos adicionales por cada hora o día de retraso. / <em>Late returns will incur additional charges per hour or day of delay.</em> / Tout retard entraînera des frais supplémentaires par heure ou jour.</p>
                <p className="mb-2"><strong>7.</strong> Este contrato tiene plena validez probatoria ante cualquier instancia judicial o administrativa. / <em>This contract has full evidentiary value before any judicial, police or administrative authority.</em> / Ce contrat a pleine valeur probatoire devant toute instance judiciaire ou administrative.</p>
                <p className="mb-2"><strong>8.</strong> Datos personales tratados conforme al RGPD (UE 2016/679). / <em>Personal data processed in accordance with GDPR (EU 2016/679).</em> / Données personnelles traitées conformément au RGPD.</p>
                <p className="mt-4 text-center text-xs text-gray-400">↓ Continuar desplazándose para aceptar · Scroll down to accept · Faites défiler pour accepter ↓</p>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Faites défiler jusqu'en bas pour débloquer la signature</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <Check size={15} className="text-green-600" />
                <p className="text-sm text-green-700 font-medium">Conditions lues — le client peut signer</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Le client signe ici :</p>
                <button type="button" onClick={clearSignature} className="text-xs text-red-500 hover:underline">Effacer</button>
              </div>
              <canvas
                ref={canvasRef}
                style={{ touchAction: 'none', width: '100%', height: '160px', border: '2px dashed #d1d5db', borderRadius: '12px', background: '#fafafa', cursor: 'crosshair', display: 'block' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              {!hasSigned && <p className="text-xs text-gray-400 text-center mt-1">← Signer avec le doigt ou la souris →</p>}
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading || !hasSigned}
            className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
            {loading ? 'Création...' : <><Check size={15} className="inline mr-1.5" />Confirmer et ouvrir la location</>}
          </button>
        </div>
      )}
    </div>
  )
}
