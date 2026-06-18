'use client'

import { useState, useEffect } from 'react'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Check, ChevronRight, ChevronLeft, CalendarDays, User, Phone, Mail, MessageSquare, Shield, Lock, BatteryCharging, ShoppingBasket } from 'lucide-react'
import { useParams } from 'next/navigation'

const BIKE_TYPES = [
  { value: 'CITY',     label: 'Vélo de ville',    labelEn: 'City bike',       icon: Bike,     color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'ELECTRIC', label: 'Vélo électrique',  labelEn: 'Electric bike',   icon: Zap,      color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'MOUNTAIN', label: 'VTT',               labelEn: 'Mountain bike',   icon: Mountain, color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'ROAD',     label: 'Vélo de route',    labelEn: 'Road bike',       icon: Flag,     color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'CARGO',    label: 'Vélo cargo',       labelEn: 'Cargo bike',      icon: Package,  color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'KIDS',     label: 'Vélo enfant',      labelEn: 'Kids bike',       icon: Heart,    color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'ESCOOTER', label: 'Trottinette',      labelEn: 'E-scooter',       icon: Gauge,    color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
]

interface ShopInfo {
  name: string
  slug: string
  availableTypes: string[]
}

export default function BookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState(1) // 1=type, 2=dates, 3=info, 4=confirm
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ACCESSORIES = [
    { key: 'helmet',    label: 'Casque',       labelEn: 'Helmet',     icon: Shield },
    { key: 'childseat', label: 'Siège enfant', labelEn: 'Child seat', icon: Heart },
    { key: 'lock',      label: 'Cadenas',      labelEn: 'Lock',       icon: Lock },
    { key: 'basket',    label: 'Panier',       labelEn: 'Basket',     icon: ShoppingBasket },
    { key: 'charger',   label: 'Chargeur',     labelEn: 'Charger',    icon: BatteryCharging },
  ]

  const [form, setForm] = useState({
    bikeType: '',
    bikeQty: 1,
    startAt: '',
    endAt: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    accessories: {} as Record<string, number>,
  })

  function setAccessoryQty(key: string, delta: number) {
    setForm(f => {
      const current = f.accessories[key] ?? 0
      const next = Math.max(0, current + delta)
      const updated = { ...f.accessories }
      if (next === 0) delete updated[key]
      else updated[key] = next
      return { ...f, accessories: updated }
    })
  }

  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setShop(data); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/book/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur'); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  const availableTypes = BIKE_TYPES.filter(t =>
    !shop?.availableTypes?.length || shop.availableTypes.includes(t.value)
  )

  const selectedType = BIKE_TYPES.find(t => t.value === form.bikeType)

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bike size={24} className="text-gray-400" />
        </div>
        <h1 className="text-lg font-semibold text-gray-800 mb-1">Shop introuvable</h1>
        <p className="text-gray-500 text-sm">Ce lien de réservation n'existe pas.</p>
      </div>
    </div>
  )

  if (!shop) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check size={26} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
        <p className="text-gray-500 text-sm mb-1">
          Merci <strong>{form.firstName}</strong>, votre demande de réservation a bien été reçue.
        </p>
        <p className="text-gray-400 text-sm">
          {shop.name} vous contactera pour confirmer. / <span className="italic">{shop.name} will contact you to confirm.</span>
        </p>
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1">
          <p className="text-gray-600"><span className="text-gray-400">Type :</span> {selectedType?.label}</p>
          <p className="text-gray-600"><span className="text-gray-400">Du :</span> {new Date(form.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-gray-600"><span className="text-gray-400">Au :</span> {new Date(form.endAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Bike size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{shop.name}</h1>
            <p className="text-xs text-gray-400">Réserver un vélo / Book a bike</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mt-5">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">

        {/* STEP 1 — Type de vélo */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Quel type de vélo ?</h2>
            <p className="text-sm text-gray-400 mb-5">What type of bike? / ¿Qué tipo de bici?</p>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map(({ value, label, labelEn, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => { setForm(f => ({ ...f, bikeType: value })); setStep(2) }}
                  className={`border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-95 ${color}`}
                >
                  <Icon size={22} className="mb-2" />
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs opacity-70">{labelEn}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Dates */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
              <ChevronLeft size={16} /> Retour
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Quand ?</h2>
            <p className="text-sm text-gray-400 mb-5">When? / ¿Cuándo?</p>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              {/* Bike quantity */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  Nombre de vélos / Number of bikes / Número de bicis
                </label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.max(1, f.bikeQty - 1) }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 text-xl font-light text-gray-600 hover:bg-gray-50 flex items-center justify-center">
                    −
                  </button>
                  <span className="text-2xl font-semibold text-gray-900 w-8 text-center">{form.bikeQty}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.min(10, f.bikeQty + 1) }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 text-xl font-light text-gray-600 hover:bg-gray-50 flex items-center justify-center">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={13} /> Début / Start / Inicio
                </label>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={13} /> Fin / End / Fin
                </label>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  min={form.startAt || new Date().toISOString().slice(0, 16)}
                  onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              disabled={!form.startAt || !form.endAt}
              onClick={() => setStep(3)}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              Continuer <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3 — Infos client */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
              <ChevronLeft size={16} /> Retour
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Vos informations</h2>
            <p className="text-sm text-gray-400 mb-5">Your details / Sus datos</p>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                    <User size={13} /> Prénom *
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jean"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nom *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Dupont"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Phone size={13} /> Téléphone / Phone *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Mail size={13} /> Email <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jean@email.com"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  📍 Adresse / Address <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rue, ville, pays..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  Accessoires / Accessories <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <div className="space-y-2">
                  {ACCESSORIES.map(({ key, label, labelEn, icon: Icon }) => {
                    const qty = form.accessories[key] ?? 0
                    return (
                      <div key={key} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${qty > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={15} className={qty > 0 ? 'text-blue-600' : 'text-gray-400'} />
                          <div>
                            <p className={`text-xs font-medium ${qty > 0 ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                            <p className="text-[10px] text-gray-400">{labelEn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setAccessoryQty(key, -1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-base leading-none">
                            −
                          </button>
                          <span className={`w-4 text-center text-sm font-semibold ${qty > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{qty}</span>
                          <button type="button" onClick={() => setAccessoryQty(key, 1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-base leading-none">
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <MessageSquare size={13} /> Message <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Taille casque M, questions..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}

            <button
              disabled={!form.firstName || !form.lastName || !form.phone || loading}
              onClick={handleSubmit}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer la demande / Send request'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Pas de paiement maintenant — confirmation par téléphone.<br />
              <span className="italic">No payment now — phone confirmation.</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-300 mt-10">Powered by VeloRent</p>
    </div>
  )
}
