'use client'

import { useState, useEffect } from 'react'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Check, ChevronLeft, Shield, Lock, BatteryCharging, ShoppingBasket, Plus, Minus, CalendarDays, User, Phone, Mail, MessageSquare, Clock } from 'lucide-react'
import { useParams } from 'next/navigation'

type Lang = 'fr' | 'en' | 'es'

const LANG = {
  fr: {
    step1Title: 'Choisissez votre véhicule',
    step1Sub: 'Quel type de vélo pour votre aventure ?',
    step2Title: 'Votre location',
    step2Sub: 'Choisissez vos dates',
    step3Title: 'Vos informations',
    step3Sub: 'Dernière étape, promis !',
    bikeQty: 'Nombre de vélos',
    start: 'Départ',
    end: 'Retour',
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Téléphone',
    optional: 'optionnel',
    address: 'Adresse',
    accessories: 'Accessoires',
    message: 'Note',
    messagePlaceholder: 'Taille de casque, demandes particulières…',
    continue: 'Continuer',
    send: 'Envoyer ma demande',
    sending: 'Envoi en cours…',
    back: 'Retour',
    change: 'Modifier',
    noPayment: 'Aucun paiement requis maintenant',
    successTitle: 'Demande envoyée !',
    successSub: (name: string) => `Merci ${name}, votre demande a bien été reçue.`,
    successNote: (shop: string) => `${shop} vous contactera pour confirmer.`,
    notFound: 'Page introuvable',
    notFoundSub: "Ce lien de réservation n'existe pas.",
    type: 'Véhicule',
    from: 'Du',
    to: 'Au',
    days: (n: number) => n === 1 ? '1 jour' : `${n} jours`,
    stepOf: (s: number) => `Étape ${s} sur 3`,
  },
  en: {
    step1Title: 'Choose your vehicle',
    step1Sub: 'What type of bike for your adventure?',
    step2Title: 'Your rental',
    step2Sub: 'Choose your dates',
    step3Title: 'Your details',
    step3Sub: 'Last step, promise!',
    bikeQty: 'Number of bikes',
    start: 'Start',
    end: 'Return',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    optional: 'optional',
    address: 'Address',
    accessories: 'Accessories',
    message: 'Note',
    messagePlaceholder: 'Helmet size, special requests…',
    continue: 'Continue',
    send: 'Send my request',
    sending: 'Sending…',
    back: 'Back',
    change: 'Change',
    noPayment: 'No payment required now',
    successTitle: 'Request sent!',
    successSub: (name: string) => `Thanks ${name}, your request has been received.`,
    successNote: (shop: string) => `${shop} will contact you to confirm.`,
    notFound: 'Page not found',
    notFoundSub: 'This booking link does not exist.',
    type: 'Vehicle',
    from: 'From',
    to: 'To',
    days: (n: number) => n === 1 ? '1 day' : `${n} days`,
    stepOf: (s: number) => `Step ${s} of 3`,
  },
  es: {
    step1Title: 'Elige tu vehículo',
    step1Sub: '¿Qué tipo de bici para tu aventura?',
    step2Title: 'Tu alquiler',
    step2Sub: 'Elige tus fechas',
    step3Title: 'Tus datos',
    step3Sub: '¡Último paso!',
    bikeQty: 'Número de bicis',
    start: 'Inicio',
    end: 'Devolución',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    optional: 'opcional',
    address: 'Dirección',
    accessories: 'Accesorios',
    message: 'Nota',
    messagePlaceholder: 'Talla de casco, peticiones especiales…',
    continue: 'Continuar',
    send: 'Enviar solicitud',
    sending: 'Enviando…',
    back: 'Volver',
    change: 'Cambiar',
    noPayment: 'Sin pago ahora',
    successTitle: '¡Solicitud enviada!',
    successSub: (name: string) => `Gracias ${name}, tu solicitud fue recibida.`,
    successNote: (shop: string) => `${shop} te contactará para confirmar.`,
    notFound: 'Página no encontrada',
    notFoundSub: 'Este enlace de reserva no existe.',
    type: 'Vehículo',
    from: 'Del',
    to: 'Al',
    days: (n: number) => n === 1 ? '1 día' : `${n} días`,
    stepOf: (s: number) => `Paso ${s} de 3`,
  },
}

const BIKE_TYPES = [
  { value: 'CITY',     fr: 'Vélo de ville',  en: 'City bike',     es: 'Bici urbana',      icon: Bike,     grad: 'from-sky-400 to-blue-500',      tagFr: 'Confort urbain',       tagEn: 'Urban comfort',     tagEs: 'Confort urbano' },
  { value: 'ELECTRIC', fr: 'Électrique',     en: 'Electric bike', es: 'Eléctrica',         icon: Zap,      grad: 'from-amber-400 to-orange-500',  tagFr: 'Assistance moteur',    tagEn: 'Motor assisted',    tagEs: 'Motor asistido' },
  { value: 'MOUNTAIN', fr: 'VTT',            en: 'Mountain',      es: 'Montaña',           icon: Mountain, grad: 'from-emerald-400 to-green-600', tagFr: 'Hors des sentiers',    tagEn: 'Off road',          tagEs: 'Todo terreno' },
  { value: 'ROAD',     fr: 'Route',          en: 'Road bike',     es: 'Carretera',         icon: Flag,     grad: 'from-red-400 to-rose-600',      tagFr: 'Vitesse & adrénaline', tagEn: 'Speed',             tagEs: 'Velocidad' },
  { value: 'CARGO',    fr: 'Cargo',          en: 'Cargo',         es: 'Cargo',             icon: Package,  grad: 'from-violet-400 to-purple-600', tagFr: 'Transport maxi',       tagEn: 'Carry more',        tagEs: 'Más capacidad' },
  { value: 'KIDS',     fr: 'Enfant',         en: 'Kids',          es: 'Infantil',          icon: Heart,    grad: 'from-pink-400 to-rose-500',     tagFr: 'Pour les petits',      tagEn: 'For little ones',   tagEs: 'Para niños' },
  { value: 'ESCOOTER', fr: 'Trottinette',    en: 'E-scooter',     es: 'Patinete',          icon: Gauge,    grad: 'from-indigo-400 to-violet-600', tagFr: 'Mobilité électrique',  tagEn: 'Electric ride',     tagEs: 'Movilidad eléctrica' },
]

const ACCESSORIES = [
  { key: 'helmet',    fr: 'Casque',       en: 'Helmet',     es: 'Casco',      icon: Shield },
  { key: 'childseat', fr: 'Siège enfant', en: 'Child seat', es: 'Silla niño', icon: Heart },
  { key: 'lock',      fr: 'Cadenas',      en: 'Lock',       es: 'Candado',    icon: Lock },
  { key: 'basket',    fr: 'Panier',       en: 'Basket',     es: 'Cesta',      icon: ShoppingBasket },
  { key: 'charger',   fr: 'Chargeur',     en: 'Charger',    es: 'Cargador',   icon: BatteryCharging },
]

interface ShopInfo { name: string; slug: string; availableTypes: string[] }

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr'
  const l = navigator.language.toLowerCase()
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('en')) return 'en'
  return 'fr'
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(ms / 86400000))
}

const INPUT = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 transition-all'

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

  function toggleAccessory(key: string) {
    setForm(f => {
      const updated = { ...f.accessories }
      if (updated[key]) delete updated[key]; else updated[key] = 1
      return { ...f, accessories: updated }
    })
  }

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
  const availableTypes = BIKE_TYPES.filter(bt => !shop?.availableTypes?.length || shop.availableTypes.includes(bt.value))
  const selectedType = BIKE_TYPES.find(bt => bt.value === form.bikeType)
  const SelectedIcon = selectedType?.icon
  const days = diffDays(form.startAt, form.endAt)
  const bkLabel = (bt: typeof BIKE_TYPES[0]) => lang === 'fr' ? bt.fr : lang === 'en' ? bt.en : bt.es
  const accLabel = (a: typeof ACCESSORIES[0]) => lang === 'fr' ? a.fr : lang === 'en' ? a.en : a.es
  const fmtDate = (s: string) => !s ? '' : new Date(s).toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'fr-FR',
    { day: '2-digit', month: 'short' }
  )
  const now = new Date().toISOString().slice(0, 16)

  // — 404
  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-5">
          <Bike size={28} className="text-slate-300" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 mb-1">{T.notFound}</h1>
        <p className="text-slate-400 text-sm">{T.notFoundSub}</p>
      </div>
    </div>
  )

  // — Loading
  if (!shop) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // — Success
  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <Check size={28} className="text-white" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">{T.successTitle}</h2>
        <p className="text-slate-500 text-sm mb-1">{T.successSub(form.firstName)}</p>
        <p className="text-slate-400 text-sm mb-6">{T.successNote(shop.name)}</p>
        {selectedType && SelectedIcon && (
          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedType.grad} flex items-center justify-center flex-shrink-0`}>
                <SelectedIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">{T.type}</p>
                <p className="text-sm font-bold text-slate-800">{bkLabel(selectedType)}</p>
              </div>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{T.from}</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(form.startAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{T.to}</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(form.endAt)}</p>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-300 mt-6">Powered by VeloRent</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}>
              <Bike size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{shop.name}</p>
              <p className="text-[10px] text-slate-400 leading-none">VeloRent</p>
            </div>
          </div>
          {/* Language switcher */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['fr', 'en', 'es'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto px-4 pb-2.5">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-36">

        {/* ── STEP 1 — Bike type ── */}
        {step === 1 && (
          <div>
            <div className="mb-7">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{T.stepOf(1)}</p>
              <h2 className="text-2xl font-black text-slate-900">{T.step1Title}</h2>
              <p className="text-slate-400 text-sm mt-1">{T.step1Sub}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map((bt) => {
                const BtIcon = bt.icon
                const tag = lang === 'fr' ? bt.tagFr : lang === 'en' ? bt.tagEn : bt.tagEs
                return (
                  <button key={bt.value}
                    onClick={() => { setForm(f => ({ ...f, bikeType: bt.value })); setStep(2) }}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]">
                    <div className={`h-1.5 bg-gradient-to-r ${bt.grad}`} />
                    <div className="p-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${bt.grad} flex items-center justify-center mb-3`}>
                        <BtIcon size={22} className="text-white" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm leading-snug">{bkLabel(bt)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{tag}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2 — Dates ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors">
              <ChevronLeft size={14} /> {T.back}
            </button>

            {/* Selected bike recap */}
            {selectedType && SelectedIcon && (
              <div className="flex items-center gap-2.5 mb-6 bg-white rounded-2xl border border-slate-100 px-4 py-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedType.grad} flex items-center justify-center flex-shrink-0`}>
                  <SelectedIcon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{bkLabel(selectedType)}</p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-indigo-400 hover:text-indigo-600 font-semibold transition-colors flex-shrink-0">
                  {T.change}
                </button>
              </div>
            )}

            <div className="mb-7">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{T.stepOf(2)}</p>
              <h2 className="text-2xl font-black text-slate-900">{T.step2Title}</h2>
              <p className="text-slate-400 text-sm mt-1">{T.step2Sub}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
              {/* Qty */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">{T.bikeQty}</label>
                <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden">
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.max(1, f.bikeQty - 1) }))}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-200">
                    <Minus size={15} />
                  </button>
                  <span className="w-14 text-center text-xl font-black text-slate-900">{form.bikeQty}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, bikeQty: Math.min(10, f.bikeQty + 1) }))}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-200">
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Start */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CalendarDays size={11} /> {T.start}
                </label>
                <input type="datetime-local" value={form.startAt} min={now}
                  onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} className={INPUT} />
              </div>

              {/* End */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CalendarDays size={11} /> {T.end}
                </label>
                <input type="datetime-local" value={form.endAt} min={form.startAt || now}
                  onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} className={INPUT} />
              </div>

              {/* Duration pill */}
              {days > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-2.5">
                  <Clock size={14} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-sm font-bold text-indigo-700">{T.days(days)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3 — Info ── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors">
              <ChevronLeft size={14} /> {T.back}
            </button>

            {/* Mini summary */}
            {selectedType && SelectedIcon && (
              <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-6 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedType.grad} flex items-center justify-center flex-shrink-0`}>
                  <SelectedIcon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{bkLabel(selectedType)}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(form.startAt)} → {fmtDate(form.endAt)}{days > 0 ? ` · ${T.days(days)}` : ''}
                  </p>
                </div>
                <button onClick={() => setStep(2)} className="text-xs text-indigo-400 hover:text-indigo-600 font-semibold transition-colors flex-shrink-0">
                  {T.change}
                </button>
              </div>
            )}

            <div className="mb-7">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{T.stepOf(3)}</p>
              <h2 className="text-2xl font-black text-slate-900">{T.step3Title}</h2>
              <p className="text-slate-400 text-sm mt-1">{T.step3Sub}</p>
            </div>

            <div className="space-y-4">
              {/* Personal info card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <User size={10} /> {T.firstName}
                    </label>
                    <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jean" className={INPUT} autoComplete="given-name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{T.lastName}</label>
                    <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Dupont" className={INPUT} autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Phone size={10} /> {T.phone}
                  </label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+33 6 12 34 56 78" className={INPUT} autoComplete="tel" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Mail size={10} /> Email{' '}
                    <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                  </label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean@email.com" className={INPUT} autoComplete="email" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    {T.address}{' '}
                    <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                  </label>
                  <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Rue, ville…" className={INPUT} autoComplete="street-address" />
                </div>
              </div>

              {/* Accessories card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {T.accessories}{' '}
                  <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACCESSORIES.map((acc) => {
                    const AccIcon = acc.icon
                    const qty = form.accessories[acc.key] ?? 0
                    const active = qty > 0
                    return (
                      <button key={acc.key} type="button" onClick={() => toggleAccessory(acc.key)}
                        className={`rounded-xl border p-3.5 text-left transition-all ${active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <AccIcon size={18} className={active ? 'text-indigo-500' : 'text-slate-300'} />
                          {active && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p className={`text-xs font-bold leading-tight mb-2 ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {accLabel(acc)}
                        </p>
                        {active && (
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => setAccessoryQty(acc.key, -1)}
                              className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold hover:bg-indigo-200 transition-colors">−</button>
                            <span className="text-xs font-bold text-indigo-700 w-4 text-center">{qty}</span>
                            <button type="button" onClick={() => setAccessoryQty(acc.key, 1)}
                              className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold hover:bg-indigo-200 transition-colors">+</button>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <MessageSquare size={10} /> {T.message}{' '}
                  <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={T.messagePlaceholder} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 resize-none text-slate-900 placeholder-slate-300 transition-all" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      {(step === 2 || step === 3) && (
        <div className="fixed bottom-0 inset-x-0 z-10">
          <div className="bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 pt-3 pb-8">
            <div className="max-w-lg mx-auto">
              {step === 2 ? (
                <button disabled={!form.startAt || !form.endAt} onClick={() => setStep(3)}
                  className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}>
                  {T.continue}
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <>
                  <button disabled={!form.firstName || !form.lastName || !form.phone || loading} onClick={handleSubmit}
                    className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}>
                    {loading ? T.sending : T.send}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-slate-400">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p className="text-[11px] text-slate-400">{T.noPayment}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
