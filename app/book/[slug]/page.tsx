'use client'

import { useState, useEffect } from 'react'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Check, ChevronLeft, ChevronRight, Shield, Lock, BatteryCharging, ShoppingBasket, Plus, Minus, User, Phone, Mail, MessageSquare, Users, Waves, Activity } from 'lucide-react'
import { useParams } from 'next/navigation'

type Lang = 'fr' | 'en' | 'es'

// ─── i18n ───────────────────────────────────────────────────────────────────
const LANG = {
  fr: {
    step1Title: 'Choisissez vos véhicules',
    step1Sub: 'Ajoutez autant de types que vous voulez',
    step2Title: 'Choisissez vos dates',
    step2Sub: 'Sélectionnez votre période de location',
    step3Title: 'Vos informations',
    step3Sub: 'Dernière étape, promis !',
    add: '+ Ajouter',
    selectAtLeastOne: 'Sélectionnez au moins un véhicule',
    start: 'Départ',
    end: 'Retour',
    pickStart: 'Sélectionnez votre date de départ',
    pickEnd: 'Sélectionnez votre date de retour',
    timePickup: 'Heure de prise en charge',
    timeReturn: 'Heure de restitution',
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
    vehicles: 'Véhicules',
    from: 'Du',
    to: 'Au',
    days: (n: number) => n === 1 ? '1 jour' : `${n} jours`,
    stepOf: (s: number) => `Étape ${s} sur 3`,
    total: (n: number) => `${n} véhicule${n > 1 ? 's' : ''}`,
  },
  en: {
    step1Title: 'Choose your vehicles',
    step1Sub: 'Add as many types as you want',
    step2Title: 'Choose your dates',
    step2Sub: 'Select your rental period',
    step3Title: 'Your details',
    step3Sub: 'Last step, promise!',
    add: '+ Add',
    selectAtLeastOne: 'Select at least one vehicle',
    start: 'Start',
    end: 'Return',
    pickStart: 'Select your start date',
    pickEnd: 'Select your return date',
    timePickup: 'Pickup time',
    timeReturn: 'Return time',
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
    vehicles: 'Vehicles',
    from: 'From',
    to: 'To',
    days: (n: number) => n === 1 ? '1 day' : `${n} days`,
    stepOf: (s: number) => `Step ${s} of 3`,
    total: (n: number) => `${n} vehicle${n > 1 ? 's' : ''}`,
  },
  es: {
    step1Title: 'Elige tus vehículos',
    step1Sub: 'Añade tantos tipos como quieras',
    step2Title: 'Elige tus fechas',
    step2Sub: 'Selecciona tu período de alquiler',
    step3Title: 'Tus datos',
    step3Sub: '¡Último paso!',
    add: '+ Añadir',
    selectAtLeastOne: 'Selecciona al menos un vehículo',
    start: 'Inicio',
    end: 'Devolución',
    pickStart: 'Selecciona tu fecha de inicio',
    pickEnd: 'Selecciona tu fecha de devolución',
    timePickup: 'Hora de recogida',
    timeReturn: 'Hora de devolución',
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
    vehicles: 'Vehículos',
    from: 'Del',
    to: 'Al',
    days: (n: number) => n === 1 ? '1 día' : `${n} días`,
    stepOf: (s: number) => `Paso ${s} de 3`,
    total: (n: number) => `${n} vehículo${n > 1 ? 's' : ''}`,
  },
}

// ─── Vehicle types ───────────────────────────────────────────────────────────
const BIKE_TYPES = [
  { value: 'CITY',     fr: 'Vélo de ville',  en: 'City bike',     es: 'Bici urbana',      icon: Bike,     grad: 'from-sky-400 to-blue-500',      tagFr: 'Confort urbain',       tagEn: 'Urban comfort',     tagEs: 'Confort urbano' },
  { value: 'ELECTRIC', fr: 'Électrique',     en: 'Electric bike', es: 'Eléctrica',         icon: Zap,      grad: 'from-amber-400 to-orange-500',  tagFr: 'Assistance moteur',    tagEn: 'Motor assisted',    tagEs: 'Motor asistido' },
  { value: 'MOUNTAIN', fr: 'VTT',            en: 'Mountain',      es: 'Montaña',           icon: Mountain, grad: 'from-emerald-400 to-green-600', tagFr: 'Hors des sentiers',    tagEn: 'Off road',          tagEs: 'Todo terreno' },
  { value: 'ROAD',     fr: 'Route',          en: 'Road bike',     es: 'Carretera',         icon: Flag,     grad: 'from-red-400 to-rose-600',      tagFr: 'Vitesse & adrénaline', tagEn: 'Speed',             tagEs: 'Velocidad' },
  { value: 'CARGO',    fr: 'Cargo',          en: 'Cargo',         es: 'Cargo',             icon: Package,  grad: 'from-violet-400 to-purple-600', tagFr: 'Transport maxi',       tagEn: 'Carry more',        tagEs: 'Más capacidad' },
  { value: 'KIDS',     fr: 'Enfant',         en: 'Kids',          es: 'Infantil',          icon: Heart,    grad: 'from-pink-400 to-rose-500',     tagFr: 'Pour les petits',      tagEn: 'For little ones',   tagEs: 'Para niños' },
  { value: 'ESCOOTER', fr: 'Trottinette',    en: 'E-scooter',     es: 'Patinete',          icon: Gauge,    grad: 'from-indigo-400 to-violet-600', tagFr: 'Mobilité électrique',  tagEn: 'Electric ride',      tagEs: 'Movilidad eléctrica' },
  { value: 'TANDEM',   fr: 'Tandem',         en: 'Tandem',        es: 'Tándem',            icon: Users,    grad: 'from-teal-400 to-cyan-600',    tagFr: 'Pour deux, fun garanti', tagEn: 'Double the fun',     tagEs: 'Doble diversión' },
  { value: 'FATBIKE',  fr: 'Fat Bike',       en: 'Fat Bike',      es: 'Fat Bike',          icon: Waves,    grad: 'from-amber-500 to-orange-600',  tagFr: 'Plage & tout-terrain', tagEn: 'Beach & off-road',   tagEs: 'Playa & campo' },
  { value: 'EMTB',     fr: 'VTT Électrique', en: 'Electric MTB',  es: 'MTB Eléctrica',     icon: Activity, grad: 'from-lime-400 to-green-600',    tagFr: 'Montagne assistée',    tagEn: 'Powered mountain',   tagEs: 'Montaña asistida' },
]

// ─── Accessories ─────────────────────────────────────────────────────────────
const ACCESSORIES = [
  { key: 'helmet',    fr: 'Casque',       en: 'Helmet',     es: 'Casco',      icon: Shield },
  { key: 'childseat', fr: 'Siège enfant', en: 'Child seat', es: 'Silla niño', icon: Heart },
  { key: 'lock',      fr: 'Cadenas',      en: 'Lock',       es: 'Candado',    icon: Lock },
  { key: 'basket',    fr: 'Panier',       en: 'Basket',     es: 'Cesta',      icon: ShoppingBasket },
  { key: 'charger',   fr: 'Chargeur',     en: 'Charger',    es: 'Cargador',   icon: BatteryCharging },
]

// ─── Calendar constants ───────────────────────────────────────────────────────
const MONTH_NAMES: Record<Lang, string[]> = {
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
}
const DAY_NAMES: Record<Lang, string[]> = {
  fr: ['Lu','Ma','Me','Je','Ve','Sa','Di'],
  en: ['Mo','Tu','We','Th','Fr','Sa','Su'],
  es: ['Lu','Ma','Mi','Ju','Vi','Sá','Do'],
}
const PICKUP_TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const RETURN_TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dayMon = (d: Date) => (d.getDay() + 6) % 7
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr'
  const l = navigator.language.toLowerCase()
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('en')) return 'en'
  return 'fr'
}

function diffDays(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86400000))
}

function applyTime(date: Date | null, time: string): Date | null {
  if (!date) return null
  const d = new Date(date)
  const [h, m] = time.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

// ─── Calendar sub-component ───────────────────────────────────────────────────
function Calendar({
  startDate, endDate, onSelect, lang,
}: {
  startDate: Date | null; endDate: Date | null
  onSelect: (d: Date) => void; lang: Lang
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const year  = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOffset = dayMon(new Date(year, month, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells  = Math.ceil((firstOffset + daysInMonth) / 7) * 7
  const today = startOfDay(new Date())

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstOffset + 1
    return d >= 1 && d <= daysInMonth ? d : null
  })

  // Group into rows of 7
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </button>
        <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{MONTH_NAMES[lang][month]} {year}</p>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        {DAY_NAMES[lang].map(d => (
          <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ flex: 1, height: 36 }} />
              const date = new Date(year, month, day)
              const isPast   = date < today
              const isStart  = !!(startDate && sameDay(date, startDate))
              const isEnd    = !!(endDate   && sameDay(date, endDate))
              const inRange  = !!(startDate && endDate && date > startDate && date < endDate)
              const isToday  = sameDay(date, today)

              const bgColor  = isStart || isEnd ? '#0d9488' : inRange ? '#e0e7ff' : 'transparent'
              const txtColor = isStart || isEnd ? '#fff' : inRange ? '#134e4a' : isPast ? '#e2e8f0' : '#334155'
              const radius   = isStart ? '10px 0 0 10px' : isEnd ? '0 10px 10px 0' : inRange ? '0' : '8px'
              const singleDay = isStart && !endDate

              return (
                <button key={di} disabled={isPast} onClick={() => onSelect(date)}
                  style={{
                    flex: 1, height: 36, border: 'none', cursor: isPast ? 'not-allowed' : 'pointer',
                    background: bgColor, color: txtColor,
                    borderRadius: singleDay ? '10px' : radius,
                    fontSize: 13, fontWeight: 600, position: 'relative',
                    transition: 'all 0.15s',
                  }}>
                  {day}
                  {isToday && !isStart && !isEnd && (
                    <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#2DD4BF', display: 'block' }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Time picker sub-component ────────────────────────────────────────────────
function TimePicker({ label, value, times, onChange }: {
  label: string; value: string; times: string[]
  onChange: (t: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {times.map(t => (
          <button key={t} type="button" onClick={() => onChange(t)}
            className={[
              'flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border',
              value === t
                ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600',
            ].join(' ')}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Shared input class ───────────────────────────────────────────────────────
const INPUT = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 transition-all'

interface ShopInfo { name: string; slug: string; availableTypes: string[] }

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [lang, setLang]       = useState<Lang>('fr')
  const [shop, setShop]       = useState<ShopInfo | null>(null)
  const [notFound, setNF]     = useState(false)
  const [step, setStep]       = useState(1)
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [picking, setPicking] = useState<'start' | 'end'>('start') // calendar mode

  const [vehicles, setVehicles] = useState<Record<string, number>>({})
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate]     = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime]     = useState('18:00')
  const [info, setInfo] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: '', notes: '',
    accessories: {} as Record<string, number>,
  })

  useEffect(() => { setLang(detectLang()) }, [])
  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setShop(d); else setNF(true) })
      .catch(() => setNF(true))
  }, [slug])

  // ── Vehicle helpers ──
  const addVehicle = (type: string) =>
    setVehicles(v => ({ ...v, [type]: (v[type] ?? 0) + 1 }))
  const removeVehicle = (type: string) =>
    setVehicles(v => {
      const n = { ...v }
      if ((n[type] ?? 0) <= 1) delete n[type]; else n[type]--
      return n
    })
  const totalVehicles = Object.values(vehicles).reduce((s, q) => s + q, 0)

  // ── Accessory helpers ──
  const toggleAcc = (key: string) =>
    setInfo(f => {
      const a = { ...f.accessories }
      if (a[key]) delete a[key]; else a[key] = 1
      return { ...f, accessories: a }
    })
  const setAccQty = (key: string, delta: number) =>
    setInfo(f => {
      const n = Math.max(0, (f.accessories[key] ?? 0) + delta)
      const a = { ...f.accessories }
      if (n === 0) delete a[key]; else a[key] = n
      return { ...f, accessories: a }
    })

  // ── Calendar selection ──
  function handleCalendarSelect(date: Date) {
    if (picking === 'start') {
      setStartDate(date)
      setEndDate(null)
      setPicking('end')
    } else {
      if (startDate && date < startDate) {
        setStartDate(date); setEndDate(null); setPicking('end')
      } else {
        setEndDate(date); setPicking('start')
      }
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    setLoading(true); setError('')

    const startAt = applyTime(startDate, startTime)
    const endAt   = applyTime(endDate,   endTime)
    if (!startAt || !endAt) { setError('Dates manquantes'); setLoading(false); return }

    const primaryType = Object.keys(vehicles)[0] ?? 'CITY'
    const totalQty    = totalVehicles

    const vehicleDesc = Object.entries(vehicles)
      .map(([type, qty]) => `${qty}× ${bkLabel(BIKE_TYPES.find(b => b.value === type)!)}`)
      .join(', ')

    const notesAll = [vehicleDesc, info.notes].filter(Boolean).join(' — ')

    const res = await fetch(`/api/book/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: info.firstName,
        lastName: info.lastName,
        phone: info.phone,
        email: info.email,
        address: info.address,
        bikeType: primaryType,
        bikeQty: totalQty,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: notesAll,
        accessories: info.accessories,
        locale: lang,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur'); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  const T = LANG[lang]
  const availableTypes = BIKE_TYPES.filter(bt => !shop?.availableTypes?.length || shop.availableTypes.includes(bt.value))
  const days = diffDays(startDate, endDate)

  const bkLabel = (bt: typeof BIKE_TYPES[0]) => lang === 'fr' ? bt.fr : lang === 'en' ? bt.en : bt.es
  const accLabel = (a: typeof ACCESSORIES[0]) => lang === 'fr' ? a.fr : lang === 'en' ? a.en : a.es

  const fmtD = (d: Date | null) => !d ? '—' : d.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'fr-FR',
    { day: '2-digit', month: 'short' }
  )

  // ── States ──────────────────────────────────────────────────────────────────
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

  if (!shop) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <Check size={28} className="text-white" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">{T.successTitle}</h2>
        <p className="text-slate-500 text-sm mb-1">{T.successSub(info.firstName)}</p>
        <p className="text-slate-400 text-sm mb-6">{T.successNote(shop.name)}</p>
        <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2.5">
          {/* Vehicle breakdown */}
          {Object.entries(vehicles).map(([type, qty]) => {
            const bt = BIKE_TYPES.find(b => b.value === type)!
            const BtIcon = bt.icon
            return (
              <div key={type} className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${bt.grad} flex items-center justify-center flex-shrink-0`}>
                  <BtIcon size={13} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{qty}× {bkLabel(bt)}</span>
              </div>
            )
          })}
          <div className="h-px bg-slate-200 my-1" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">{T.from}</p>
              <p className="text-sm font-bold text-slate-800">{fmtD(startDate)}</p>
              <p className="text-xs text-slate-400">{startTime}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">{T.to}</p>
              <p className="text-sm font-bold text-slate-800">{fmtD(endDate)}</p>
              <p className="text-xs text-slate-400">{endTime}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-300 mt-6">Powered by VeloRent</p>
      </div>
    </div>
  )

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
              <Bike size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{shop.name}</p>
              <p className="text-[10px] text-slate-400 leading-none">VeloRent</p>
            </div>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['fr', 'en', 'es'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-2.5">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-36">

        {/* ── STEP 1 — Multi-vehicle selection ── */}
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
                const qty = vehicles[bt.value] ?? 0
                const active = qty > 0
                const tag = lang === 'fr' ? bt.tagFr : lang === 'en' ? bt.tagEn : bt.tagEs
                return (
                  <div key={bt.value}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${active ? 'border-indigo-200 shadow-md shadow-indigo-100' : 'border-slate-100 hover:shadow-sm'}`}>
                    <div className={`h-1.5 bg-gradient-to-r ${bt.grad}`} />
                    <div className="p-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${bt.grad} flex items-center justify-center mb-3`}>
                        <BtIcon size={22} className="text-white" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm leading-snug">{bkLabel(bt)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-3">{tag}</p>

                      {qty === 0 ? (
                        <button onClick={() => addVehicle(bt.value)}
                          className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
                          <Plus size={13} /> {T.add}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeVehicle(bt.value)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors">
                            <Minus size={13} />
                          </button>
                          <span className="text-xl font-black text-indigo-600 w-7 text-center">{qty}</span>
                          <button onClick={() => addVehicle(bt.value)}
                            className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-sm">
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2 — Calendar + Time ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors">
              <ChevronLeft size={14} /> {T.back}
            </button>

            {/* Vehicle recap */}
            <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-5 flex items-center gap-3 flex-wrap">
              {Object.entries(vehicles).map(([type, qty]) => {
                const bt = BIKE_TYPES.find(b => b.value === type)!
                const BtIcon = bt.icon
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${bt.grad} flex items-center justify-center flex-shrink-0`}>
                      <BtIcon size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{qty}× {bkLabel(bt)}</span>
                  </div>
                )
              })}
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-indigo-400 hover:text-indigo-600 font-semibold transition-colors flex-shrink-0">
                {T.change}
              </button>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{T.stepOf(2)}</p>
              <h2 className="text-2xl font-black text-slate-900">{T.step2Title}</h2>
              <p className="text-slate-400 text-sm mt-1">{T.step2Sub}</p>
            </div>

            {/* Date range display + mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setPicking('start')}
                className={`rounded-xl p-3.5 border text-left transition-all ${picking === 'start' ? 'border-indigo-400 bg-indigo-50 shadow-sm' : startDate ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-white'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{T.start}</p>
                <p className={`text-sm font-black ${startDate ? 'text-slate-900' : 'text-slate-300'}`}>{fmtD(startDate)}</p>
                {startDate && <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">{startTime}</p>}
              </button>
              <button onClick={() => startDate && setPicking('end')}
                className={`rounded-xl p-3.5 border text-left transition-all ${picking === 'end' ? 'border-indigo-400 bg-indigo-50 shadow-sm' : endDate ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-white'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{T.end}</p>
                <p className={`text-sm font-black ${endDate ? 'text-slate-900' : 'text-slate-300'}`}>{fmtD(endDate)}</p>
                {endDate && <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">{endTime}</p>}
              </button>
            </div>

            {/* Instruction */}
            <p className="text-xs text-center font-semibold text-indigo-500 mb-4">
              {picking === 'start' ? T.pickStart : T.pickEnd}
            </p>

            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
              <Calendar startDate={startDate} endDate={endDate} onSelect={handleCalendarSelect} lang={lang} />
            </div>

            {/* Duration + time pickers (appear after both dates selected) */}
            {startDate && endDate && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
                {/* Duration badge */}
                <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-bold text-indigo-700">
                    {fmtD(startDate)} → {fmtD(endDate)} · {T.days(days)}
                  </span>
                </div>
                {/* Time pickers */}
                <TimePicker label={T.timePickup} value={startTime} times={PICKUP_TIMES} onChange={setStartTime} />
                <TimePicker label={T.timeReturn} value={endTime}   times={RETURN_TIMES}  onChange={setEndTime} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 — Info + accessories ── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors">
              <ChevronLeft size={14} /> {T.back}
            </button>

            {/* Mini recap */}
            <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-6 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                {Object.entries(vehicles).map(([type, qty]) => {
                  const bt = BIKE_TYPES.find(b => b.value === type)!
                  const BtIcon = bt.icon
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${bt.grad} flex items-center justify-center`}>
                        <BtIcon size={10} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{qty}×</span>
                    </div>
                  )
                })}
                <span className="text-xs text-slate-400">
                  {fmtD(startDate)} → {fmtD(endDate)} · {T.days(days)}
                </span>
              </div>
              <button onClick={() => setStep(2)} className="text-xs text-indigo-400 hover:text-indigo-600 font-semibold transition-colors flex-shrink-0">
                {T.change}
              </button>
            </div>

            <div className="mb-7">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{T.stepOf(3)}</p>
              <h2 className="text-2xl font-black text-slate-900">{T.step3Title}</h2>
              <p className="text-slate-400 text-sm mt-1">{T.step3Sub}</p>
            </div>

            <div className="space-y-4">
              {/* Personal info */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <User size={10} /> {T.firstName}
                    </label>
                    <input type="text" value={info.firstName} onChange={e => setInfo(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jean" className={INPUT} autoComplete="given-name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{T.lastName}</label>
                    <input type="text" value={info.lastName} onChange={e => setInfo(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Dupont" className={INPUT} autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Phone size={10} /> {T.phone}
                  </label>
                  <input type="tel" value={info.phone} onChange={e => setInfo(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+33 6 12 34 56 78" className={INPUT} autoComplete="tel" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Mail size={10} /> Email{' '}
                    <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                  </label>
                  <input type="email" value={info.email} onChange={e => setInfo(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean@email.com" className={INPUT} autoComplete="email" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    {T.address}{' '}
                    <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                  </label>
                  <input type="text" value={info.address} onChange={e => setInfo(f => ({ ...f, address: e.target.value }))}
                    placeholder="Rue, ville…" className={INPUT} autoComplete="street-address" />
                </div>
              </div>

              {/* Accessories */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {T.accessories}{' '}
                  <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACCESSORIES.map((acc) => {
                    const AccIcon = acc.icon
                    const qty = info.accessories[acc.key] ?? 0
                    const active = qty > 0
                    return (
                      <div key={acc.key}
                        className={`rounded-xl border p-3.5 transition-all cursor-pointer select-none ${active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                        onClick={() => toggleAcc(acc.key)}>
                        <div className="flex items-center justify-between mb-2">
                          <AccIcon size={18} className={active ? 'text-indigo-500' : 'text-slate-300'} />
                          {active && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <p className={`text-xs font-bold leading-tight mb-2 ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {accLabel(acc)}
                        </p>
                        {active && (
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => setAccQty(acc.key, -1)}
                              className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold hover:bg-indigo-200 transition-colors">−</button>
                            <span className="text-xs font-bold text-indigo-700 w-4 text-center">{qty}</span>
                            <button type="button" onClick={() => setAccQty(acc.key, 1)}
                              className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold hover:bg-indigo-200 transition-colors">+</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <MessageSquare size={10} /> {T.message}{' '}
                  <span className="font-normal text-slate-300 normal-case tracking-normal">— {T.optional}</span>
                </label>
                <textarea value={info.notes} onChange={e => setInfo(f => ({ ...f, notes: e.target.value }))}
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
      <div className="fixed bottom-0 inset-x-0 z-10">
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 pt-3 pb-8">
          <div className="max-w-lg mx-auto">

            {step === 1 && (
              totalVehicles > 0 ? (
                <button onClick={() => setStep(2)}
                  className="w-full py-4 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
                  <span>{T.total(totalVehicles)}</span>
                  <span>·</span>
                  <span>{T.continue}</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl text-sm font-semibold text-slate-400 bg-slate-100 text-center">
                  {T.selectAtLeastOne}
                </div>
              )
            )}

            {step === 2 && (
              <button disabled={!startDate || !endDate} onClick={() => setStep(3)}
                className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
                {T.continue}
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}

            {step === 3 && (
              <>
                <button disabled={!info.firstName || !info.lastName || !info.phone || loading} onClick={handleSubmit}
                  className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
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
    </div>
  )
}
