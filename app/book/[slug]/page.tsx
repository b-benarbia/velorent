'use client'

import { useState, useEffect } from 'react'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Check, ChevronRight, ChevronLeft, CalendarDays, User, Phone, Mail, MessageSquare, Shield, Lock, BatteryCharging, ShoppingBasket } from 'lucide-react'
import { useParams } from 'next/navigation'

type Lang = 'fr' | 'en' | 'es'

const LANG = {
  fr: {
    bikeQuestion: 'Quel type de vélo ?',
    whenQuestion: 'Quand ?',
    yourInfo: 'Vos informations',
    bikeQty: 'Nombre de vélos',
    start: 'Début',
    end: 'Fin',
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Téléphone',
    optional: 'optionnel',
    address: 'Adresse',
    accessories: 'Accessoires',
    message: 'Message',
    messagePlaceholder: 'Taille casque M, questions...',
    continue: 'Continuer',
    send: 'Envoyer la demande',
    sending: 'Envoi...',
    back: 'Retour',
    noPayment: 'Pas de paiement maintenant — confirmation par la boutique.',
    successTitle: 'Demande envoyée !',
    successSub: (name: string) => `Merci ${name}, votre demande a bien été reçue.`,
    successNote: (shop: string) => `${shop} vous contactera pour confirmer.`,
    notFound: 'Shop introuvable',
    notFoundSub: "Ce lien de réservation n'existe pas.",
    type: 'Type',
    from: 'Du',
    to: 'Au',
  },
  en: {
    bikeQuestion: 'What type of bike?',
    whenQuestion: 'When?',
    yourInfo: 'Your details',
    bikeQty: 'Number of bikes',
    start: 'Start',
    end: 'End',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    optional: 'optional',
    address: 'Address',
    accessories: 'Accessories',
    message: 'Message',
    messagePlaceholder: 'Helmet size M, questions...',
    continue: 'Continue',
    send: 'Send request',
    sending: 'Sending...',
    back: 'Back',
    noPayment: 'No payment now — confirmation by the shop.',
    successTitle: 'Request sent!',
    successSub: (name: string) => `Thanks ${name}, your request has been received.`,
    successNote: (shop: string) => `${shop} will contact you to confirm.`,
    notFound: 'Shop not found',
    notFoundSub: 'This booking link does not exist.',
    type: 'Type',
    from: 'From',
    to: 'To',
  },
  es: {
    bikeQuestion: '¿Qué tipo de bici?',
    whenQuestion: '¿Cuándo?',
    yourInfo: 'Sus datos',
    bikeQty: 'Número de bicis',
    start: 'Inicio',
    end: 'Fin',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    optional: 'opcional',
    address: 'Dirección',
    accessories: 'Accesorios',
    message: 'Mensaje',
    messagePlaceholder: 'Talla casco M, preguntas...',
    continue: 'Continuar',
    send: 'Enviar solicitud',
    sending: 'Enviando...',
    back: 'Volver',
    noPayment: 'Sin pago ahora — confirmación por la tienda.',
    successTitle: '¡Solicitud enviada!',
    successSub: (name: string) => `Gracias ${name}, tu solicitud ha sido recibida.`,
    successNote: (shop: string) => `${shop} te contactará para confirmar.`,
    notFound: 'Tienda no encontrada',
    notFoundSub: 'Este enlace de reserva no existe.',
    type: 'Tipo',
    from: 'Desde',
    to: 'Hasta',
  },
}

const BIKE_TYPES = [
  { value: 'CITY',     fr: 'Vélo de ville',   en: 'City bike',      es: 'Bici urbana',    icon: Bike,     color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'ELECTRIC', fr: 'Vélo électrique', en: 'Electric bike',  es: 'Bici eléctrica', icon: Zap,      color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'MOUNTAIN', fr: 'VTT',             en: 'Mountain bike',  es: 'Bici de montaña',icon: Mountain, color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'ROAD',     fr: 'Vélo de route',   en: 'Road bike',      es: 'Bici de carretera',icon: Flag,   color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'CARGO',    fr: 'Vélo cargo',      en: 'Cargo bike',     es: 'Bici de carga',  icon: Package,  color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'KIDS',     fr: 'Vélo enfant',     en: 'Kids bike',      es: 'Bici infantil',  icon: Heart,    color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'ESCOOTER', fr: 'Trottinette',     en: 'E-scooter',      es: 'Patinete',       icon: Gauge,    color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
]

const ACCESSORIES = [
  { key: 'helmet',    fr: 'Casque',       en: 'Helmet',     es: 'Casco',        icon: Shield },
  { key: 'childseat', fr: 'Siège enfant', en: 'Child seat', es: 'Silla niño',   icon: Heart },
  { key: 'lock',      fr: 'Cadenas',      en: 'Lock',       es: 'Candado',      icon: Lock },
  { key: 'basket',    fr: 'Panier',       en: 'Basket',     es: 'Cesta',        icon: ShoppingBasket },
  { key: 'charger',   fr: 'Chargeur',     en: 'Charger',    es: 'Cargador',     icon: BatteryCharging },
]

interface ShopInfo { name: string; slug: string; availableTypes: string[] }

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr'
  const l = navigator.language.toLowerCase()
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('en')) return 'en'
  return 'fr'
}

export default function BookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [lang, setLang] = useState<Lang>('fr')
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    bikeType: '', bikeQty: 1, startAt: '', endAt: '',
    firstName: '', lastName: '', phone: '', email: '',
    address: '', notes: '',
    accessories: {} as Record<string, number>,
  })

  useEffect(() => { setLang(detectLang()) }, [])

  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setShop(data); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  function setAccessoryQty(key: string, delta: number) {
    setForm(f => {
      const next = Math.max(0, (f.accessories[key] ?? 0) + delta)
      const updated = { ...f.accessories }
      if (next === 0) delete updated[key]; else updated[key] = next
      return { ...f, accessories: updated }
    })
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const res = await fetch(`/api/book/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, locale: lang }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur'); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  const T = LANG[lang]
  const availableTypes = BIKE_TYPES.filter(t => !shop?.availableTypes?.length || shop.availableTypes.includes(t.value))
  const selectedType = BIKE_TYPES.find(t => t.value === form.bikeType)

  const INPUT = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const LANG_BTN = (l: Lang) => `px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-700'}`

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bike size={24} className="text-gray-400" />
        </div>
        <h1 className="text-lg font-semibold text-gray-800 mb-1">{T.notFound}</h1>
        <p className="text-gray-500 text-sm">{T.notFoundSub}</p>
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">{T.successTitle}</h2>
        <p className="text-gray-500 text-sm mb-1">{T.successSub(form.firstName)}</p>
        <p className="text-gray-400 text-sm">{T.successNote(shop.name)}</p>
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1">
          <p className="text-gray-600"><span className="text-gray-400">{T.type} :</span> {selectedType?.[lang]}</p>
          <p className="text-gray-600"><span className="text-gray-400">{T.from} :</span> {new Date(form.startAt).toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-gray-600"><span className="text-gray-400">{T.to} :</span> {new Date(form.endAt).toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Bike size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">{shop.name}</h1>
              <p className="text-xs text-gray-400">VeloRent</p>
            </div>
          </div>
          {/* Language switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['fr', 'en', 'es'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} className={LANG_BTN(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 mt-5">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">

        {/* STEP 1 — Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{T.bikeQuestion}</h2>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map(({ value, fr, en, es, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => { setForm(f => ({ ...f, bikeType: value })); setStep(2) }}
                  className={`border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-95 ${color}`}
                >
                  <Icon size={22} className="mb-2" />
                  <p className="font-semibold text-sm">{lang === 'fr' ? fr : lang === 'en' ? en : es}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Dates */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
              <ChevronLeft size={16} /> {T.back}
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{T.whenQuestion}</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">{T.bikeQty}</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.max(1, f.bikeQty - 1) }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 text-xl font-light text-gray-600 hover:bg-gray-50 flex items-center justify-center">−</button>
                  <span className="text-2xl font-semibold text-gray-900 w-8 text-center">{form.bikeQty}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.min(10, f.bikeQty + 1) }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 text-xl font-light text-gray-600 hover:bg-gray-50 flex items-center justify-center">+</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={13} /> {T.start}
                </label>
                <input type="datetime-local" value={form.startAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                  className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={13} /> {T.end}
                </label>
                <input type="datetime-local" value={form.endAt}
                  min={form.startAt || new Date().toISOString().slice(0, 16)}
                  onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                  className={INPUT} />
              </div>
            </div>
            <button disabled={!form.startAt || !form.endAt} onClick={() => setStep(3)}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {T.continue} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3 — Infos */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
              <ChevronLeft size={16} /> {T.back}
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{T.yourInfo}</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5"><User size={13} /> {T.firstName} *</label>
                  <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean" className={INPUT} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">{T.lastName} *</label>
                  <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" className={INPUT} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5"><Phone size={13} /> {T.phone} *</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Mail size={13} /> Email <span className="font-normal text-gray-400">({T.optional})</span>
                </label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@email.com" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  📍 {T.address} <span className="font-normal text-gray-400">({T.optional})</span>
                </label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rue, ville..." className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  {T.accessories} <span className="font-normal text-gray-400">({T.optional})</span>
                </label>
                <div className="space-y-2">
                  {ACCESSORIES.map(({ key, fr, en, es, icon: Icon }) => {
                    const qty = form.accessories[key] ?? 0
                    const label = lang === 'fr' ? fr : lang === 'en' ? en : es
                    return (
                      <div key={key} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${qty > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={15} className={qty > 0 ? 'text-blue-600' : 'text-gray-400'} />
                          <p className={`text-xs font-medium ${qty > 0 ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setAccessoryQty(key, -1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-base leading-none">−</button>
                          <span className={`w-4 text-center text-sm font-semibold ${qty > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{qty}</span>
                          <button type="button" onClick={() => setAccessoryQty(key, 1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-base leading-none">+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <MessageSquare size={13} /> {T.message} <span className="font-normal text-gray-400">({T.optional})</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={T.messagePlaceholder} rows={2} className={`${INPUT} resize-none`} />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}

            <button disabled={!form.firstName || !form.lastName || !form.phone || loading} onClick={handleSubmit}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {loading ? T.sending : T.send}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">{T.noPayment}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-10">Powered by VeloRent</p>
    </div>
  )
}
