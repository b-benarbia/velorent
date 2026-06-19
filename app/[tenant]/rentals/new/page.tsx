'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import SignaturePad, { type SignaturePadHandle } from './_components/SignaturePad'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Shield, Lock, BatteryCharging, ShoppingBasket, Heart, Banknote, CreditCard, Smartphone, Building2, Check, Camera, Bike, Zap, Mountain, Package, Flag, Gauge, Users, Waves, Activity, FileText, Euro, ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import CountrySelect from '../../_components/CountrySelect'

interface Bike { id: string; code: string; name: string; dailyRate: number; hourlyRate: number | null; type: string; status: string }
interface Customer { id: string; firstName: string; lastName: string; phone: string | null }

const FIXED_ACCESSORIES = [
  { type: 'HELMET',     label: 'Helmet',      tKey: 'helmet',    Icon: Shield,         hasCode: false, pricingKey: 'HELMET' },
  { type: 'LOCK',       label: 'Lock',        tKey: 'lock',      Icon: Lock,           hasCode: true,  pricingKey: null },
  { type: 'CHARGER',    label: 'Charger',     tKey: 'charger',   Icon: BatteryCharging,hasCode: false, pricingKey: 'CHARGER' },
  { type: 'BASKET',     label: 'Basket',      tKey: 'basket',    Icon: ShoppingBasket, hasCode: false, pricingKey: 'BASKET' },
  { type: 'CHILD_SEAT', label: 'Child seat',  tKey: 'childSeat', Icon: Heart,          hasCode: false, pricingKey: 'CHILD_SEAT' },
]

const DURATIONS = [
  { key: '1h',    label: '1h',     hours: 1 },
  { key: '2h',    label: '2h',     hours: 2 },
  { key: '4h',    label: '4h',     hours: 4 },
  { key: '1day',  label: '1 day',  hours: 10 },
  { key: '24h',   label: '24h',    hours: 24 },
  { key: '2days', label: '2 days', hours: 48 },
  { key: '3days', label: '3 days', hours: 72 },
  { key: '4days', label: '4 days', hours: 96 },
  { key: '5days', label: '5 days', hours: 120 },
  { key: '6days', label: '6 days', hours: 144 },
  { key: 'week',  label: 'Week',   hours: 168 },
  { key: 'extra', label: '+1d',    hours: 24 },
]

const TYPE_LABEL: Record<string, string> = {
  CITY: 'City', ELECTRIC: 'Electric', MOUNTAIN: 'Mountain',
  CARGO: 'Cargo', KIDS: 'Kids', ESCOOTER: 'E-Scooter', ROAD: 'Road',
  TANDEM: 'Tandem', FATBIKE: 'Fat Bike', EMTB: 'E-MTB',
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; headerBg: string; selectedBg: string }> = {
  CITY:     { icon: Bike,     headerBg: 'bg-indigo-50',  selectedBg: 'bg-indigo-500' },
  ELECTRIC: { icon: Zap,      headerBg: 'bg-amber-50',   selectedBg: 'bg-amber-500' },
  MOUNTAIN: { icon: Mountain, headerBg: 'bg-emerald-50', selectedBg: 'bg-emerald-600' },
  ROAD:     { icon: Flag,     headerBg: 'bg-red-50',     selectedBg: 'bg-red-500' },
  CARGO:    { icon: Package,  headerBg: 'bg-purple-50',  selectedBg: 'bg-purple-500' },
  KIDS:     { icon: Heart,    headerBg: 'bg-pink-50',    selectedBg: 'bg-pink-500' },
  ESCOOTER: { icon: Gauge,    headerBg: 'bg-slate-100',  selectedBg: 'bg-slate-600' },
  TANDEM:   { icon: Users,    headerBg: 'bg-teal-50',    selectedBg: 'bg-teal-500' },
  FATBIKE:  { icon: Waves,    headerBg: 'bg-amber-50',   selectedBg: 'bg-amber-600' },
  EMTB:     { icon: Activity, headerBg: 'bg-lime-50',    selectedBg: 'bg-lime-600' },
}

const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER', 'TANDEM', 'FATBIKE', 'EMTB']

const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 placeholder-slate-400 transition-colors'

type PricingGrid = Record<string, Record<string, number> | undefined> & {
  accessories?: Record<string, number>
}

export default function NewRentalPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tenant = params.tenant as string
  const t = useTranslations('newRental')
  const tPayment = useTranslations('payment')
  const [fromReservation, setFromReservation] = useState(false)

  const [step, setStep] = useState(1)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pricingGrid, setPricingGrid] = useState<PricingGrid>({})
  const [depositConfig, setDepositConfig] = useState<Record<string, number>>({})

  const [accessoryQty, setAccessoryQty] = useState<Record<string, number>>({})
  const [accessoryCodes, setAccessoryCodes] = useState<Record<string, string[]>>({})
  const [selectedDuration, setSelectedDuration] = useState('')
  const [manualPrice, setManualPrice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedBikeIds, setSelectedBikeIds] = useState<string[]>([])
  const [depositType, setDepositType] = useState<'MONEY' | 'ID'>('MONEY')
  const [depositIdType, setDepositIdType] = useState('PASSPORT')
  const [showReturnPicker, setShowReturnPicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(() => new Date())
  const [stepDir, setStepDir] = useState<'fwd' | 'back'>('fwd')
  const [showSuccess, setShowSuccess] = useState(false)

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

  // ── Signature pads (signature_pad lib — touch/scroll safe) ───────────────
  const clientPadRef = useRef<SignaturePadHandle>(null)
  const staffPadRef  = useRef<SignaturePadHandle>(null)
  const [clientSigned, setClientSigned] = useState(false)
  const [staffSigned,  setStaffSigned]  = useState(false)
  const [hasReadTerms, setHasReadTerms] = useState(false)

  useEffect(() => {
    fetch('/api/bikes').then(r => r.json()).then(data => setBikes(data.filter((b: Bike) => b.status === 'AVAILABLE')))
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
    fetch('/api/settings/pricing').then(r => r.json()).then(setPricingGrid).catch(() => {})
    fetch('/api/settings/shop').then(r => r.json()).then(d => setDepositConfig(d.depositConfig ?? {})).catch(() => {})
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

  // Auto-remplir la caution : 1 caution par type unique (pas par quantité)
  useEffect(() => {
    if (selectedBikeIds.length === 0) return
    const uniqueTypes = new Set(
      selectedBikeIds.map(id => bikes.find(b => b.id === id)?.type).filter(Boolean)
    )
    let total = 0
    uniqueTypes.forEach(type => { total += depositConfig[type!] ?? 0 })
    setForm(f => ({ ...f, depositAmount: total.toFixed(2) }))
  }, [selectedBikeIds, bikes, depositConfig])

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

  // ── Duration label map (translated) ──────────────────────────────────
  const DUR_LABEL: Record<string, string> = {
    '1h': '1h', '2h': '2h', '4h': '4h', '24h': '24h',
    '1day':  t('dur1day'),
    '2days': t('dur2days'),
    '3days': t('dur3days'),
    '4days': t('dur4days'),
    '5days': t('dur5days'),
    '6days': t('dur6days'),
    'week':  t('durWeek'),
  }

  // ── Return date picker helpers ────────────────────────────────────────
  function getReturnDate(): Date | null {
    if (!form.expectedReturnAt) return null
    return new Date(form.expectedReturnAt)
  }
  function setReturnDate(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0')
    setForm(f => ({ ...f, expectedReturnAt: `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }))
  }
  function pickDay(day: number) {
    const cur = getReturnDate() ?? new Date()
    setReturnDate(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day, cur.getHours(), cur.getMinutes()))
  }
  function pickHour(delta: number) {
    const cur = getReturnDate() ?? new Date()
    const h = (cur.getHours() + delta + 24) % 24
    setReturnDate(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), h, cur.getMinutes()))
  }
  function pickMinute(m: number) {
    const cur = getReturnDate() ?? new Date()
    setReturnDate(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), cur.getHours(), m))
  }
  // Calendar cells (Mon-first)
  function buildCalendar(month: Date) {
    const y = month.getFullYear(), mo = month.getMonth()
    const firstDay = (new Date(y, mo, 1).getDay() + 6) % 7
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    const cells: (number | null)[] = [...Array(firstDay).fill(null)]
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks
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
    const depositPerBike = depositType === 'ID' ? '0'
      : nbBikes > 1
        ? (Math.round((parseFloat(form.depositAmount || '0') / nbBikes) * 100) / 100).toFixed(2)
        : form.depositAmount

    const notesWithDeposit = depositType === 'ID'
      ? `[Caution : ${depositIdType.replace('_', ' ')}]${form.notes ? ' — ' + form.notes : ''}`
      : form.notes

    const results = await Promise.all(
      selectedBikeIds.map(bikeId =>
        fetch('/api/rentals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            notes: notesWithDeposit,
            bikeId,
            customerId,
            amountPaid: amountPerBike,
            depositAmount: depositPerBike,
            openingSignature: clientPadRef.current?.toDataURL() ?? '',
            staffSignature:   staffPadRef.current?.toDataURL()  ?? '',
            accessories: accessoriesPayload,
          }),
        }).then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      )
    )

    const failed = results.find(r => !r.ok)
    if (failed) { setError(failed.data.error); setLoading(false); return }

    setShowSuccess(true)
    setTimeout(() => {
      router.push(`/${tenant}/rentals/${results[0].data.id}/contract`)
    }, 1400)
  }

  const canNextStep1 = newCustomer ? customerForm.firstName && customerForm.lastName : form.customerId
  const canNextStep2 = selectedBikeIds.length > 0
  const isEscooter = selectedBike?.type === 'ESCOOTER'
  const hasHelmet = (accessoryQty['HELMET'] ?? 0) > 0
  const canNextStep3 = !!form.amountPaid && (!isEscooter || hasHelmet)

  const STEPS = [t('step1'), t('step2'), t('step3'), t('step4')]

  return (
    <div className="max-w-lg mx-auto">
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(32px) } to { opacity:1; transform:translateX(0) } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
        .step-enter-fwd { animation: slideInRight 0.22s cubic-bezier(.25,.8,.25,1) both }
        .step-enter-bwd { animation: slideInLeft  0.22s cubic-bezier(.25,.8,.25,1) both }
      `}</style>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => { if (step > 1) { setStepDir('back'); setStep(step - 1); if (step === 4) { setHasReadTerms(false); setClientSigned(false); setStaffSigned(false); clientPadRef.current?.clear(); staffPadRef.current?.clear() } } else { router.back() } }}
          className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
        >
          {t('back')}
        </button>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{t('title')}</h1>
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

      {/* ─── STEP 1 — CUSTOMER ─── */}
      {step === 1 && (
        <div key="s1" className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-4 ${stepDir === 'fwd' ? 'step-enter-fwd' : 'step-enter-bwd'}`}>
          {fromReservation && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700 font-medium flex items-center gap-2">
              <Check size={13} /> {t('prefilledFromReservation')}
            </div>
          )}
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-900 text-sm">{t('customerInfo')}</h2>
            <button type="button" onClick={() => { setNewCustomer(!newCustomer); setForm(f => ({ ...f, customerId: '' })) }}
              className="text-xs font-semibold hover:underline" style={{ color: '#6366F1' }}>
              {newCustomer ? t('existingCustomer') : t('newCustomer')}
            </button>
          </div>

          {newCustomer ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('firstName')} *</label>
                  <input type="text" required value={customerForm.firstName}
                    onChange={e => setCustomerForm({ ...customerForm, firstName: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('lastName')} *</label>
                  <input type="text" required value={customerForm.lastName}
                    onChange={e => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('phone')}</label>
                  <input type="tel" value={customerForm.phone}
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('email')}</label>
                  <input type="email" value={customerForm.email}
                    onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('documentType')}</label>
                  <select value={customerForm.documentType}
                    onChange={e => setCustomerForm({ ...customerForm, documentType: e.target.value })}
                    className={INPUT}>
                    <option value="PASSPORT">{t('passport')}</option>
                    <option value="DNI">{t('dni')}</option>
                    <option value="NIE">{t('nie')}</option>
                    <option value="ID_CARD">{t('idCard')}</option>
                    <option value="DRIVING_LICENSE">{t('drivingLicense')}</option>
                    <option value="OTHER">{t('other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('documentNumber')}</label>
                  <input type="text" value={customerForm.documentNumber}
                    onChange={e => setCustomerForm({ ...customerForm, documentNumber: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('nationality')}</label>
                <CountrySelect
                  value={customerForm.nationality}
                  onChange={v => setCustomerForm({ ...customerForm, nationality: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('addressLabel')}</label>
                <input type="text" value={customerForm.address}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder={t('addressPlaceholder')} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Camera size={12} className="text-slate-400" /> {t('documentPhoto')}
                </label>
                {documentPhoto ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={documentPhoto} alt="ID" className="w-full h-36 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => setDocumentPhoto(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">{t('retake')}</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    <Camera size={20} className="text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">{t('takePhoto')}</span>
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
                {!documentPhoto && <p className="text-xs text-slate-400 mt-1">{t('docPhotoHint')}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className={INPUT}>
                <option value="">{t('selectCustomer')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` — ${c.phone}` : ''}</option>)}
              </select>
              {/* Customer history badge */}
              {form.customerId && (() => {
                const sel = customers.find(c => c.id === form.customerId)
                if (!sel) return null
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '12px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0,
                    }}>
                      {sel.firstName[0]}{sel.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{sel.firstName} {sel.lastName}</p>
                      {sel.phone && <p style={{ fontSize: '12px', color: '#64748b' }}>{sel.phone}</p>}
                    </div>
                    <Check size={16} style={{ color: '#22c55e', marginLeft: 'auto', flexShrink: 0 }} />
                  </div>
                )
              })()}
            </div>
          )}

          <button onClick={() => { setStepDir('fwd'); setStep(2) }} disabled={!canNextStep1}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
            style={{ background: '#6366F1' }}>
            {t('continue')}
          </button>
        </div>
      )}

      {/* ─── STEP 2 — BIKE ─── */}
      {step === 2 && (() => {
        const grouped = TYPE_ORDER
          .map(type => ({ type, items: bikes.filter(b => b.type === type) }))
          .filter(g => g.items.length > 0)
        const otherTypes = [...new Set(bikes.map(b => b.type))].filter(t => !TYPE_ORDER.includes(t))
        otherTypes.forEach(type => grouped.push({ type, items: bikes.filter(b => b.type === type) }))

        return (
          <div key="s2" className={`space-y-3 ${stepDir === 'fwd' ? 'step-enter-fwd' : 'step-enter-bwd'}`}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-semibold text-slate-900">{t('chooseABike')}</h2>
              <div className="flex items-center gap-2">
                {selectedBikeIds.length > 0 && (
                  <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: '#6366F1' }}>
                    {selectedBikeIds.length} {t('selectedCount')}
                  </span>
                )}
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {bikes.length} {t('available')}
                </span>
              </div>
            </div>

            {bikes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Bike size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-amber-500 font-medium">{t('noBikesAvailable')}</p>
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
                            className={`flex flex-col items-start px-3 py-2 rounded-xl border-2 transition-all active:scale-95 text-left ${
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

            <button onClick={() => { setStepDir('fwd'); setStep(3) }} disabled={!canNextStep2}
              className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
              style={{ background: '#6366F1' }}>
              {t('continue')}
            </button>
          </div>
        )
      })()}

      {/* ─── STEP 3 — PAYMENT ─── */}
      {step === 3 && (
        <div key="s3" className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-5 ${stepDir === 'fwd' ? 'step-enter-fwd' : 'step-enter-bwd'}`}>
          <h2 className="font-semibold text-slate-900 text-sm">{t('paymentTitle')}</h2>

          {/* Selected bikes */}
          {selectedBikes.length > 0 && (
            <div className="rounded-xl border border-indigo-100 p-3 space-y-1" style={{ background: '#eef2ff' }}>
              {selectedBikes.map(bike => (
                <div key={bike.id} className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-indigo-900">{bike.name}</p>
                  <p className="text-xs text-indigo-400">{bike.code} · {TYPE_LABEL[bike.type] ?? bike.type}</p>
                </div>
              ))}
              {selectedBikes.length > 1 && (
                <p className="text-xs text-indigo-400 pt-1 border-t border-indigo-200">{selectedBikes.length} {t('bikes')}</p>
              )}
            </div>
          )}

          {/* Duration selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              {t('rentalDuration')}
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
                    className={`rounded-xl border py-2.5 text-center transition-all active:scale-95 ${
                      isSelected
                        ? 'border-transparent text-white'
                        : price !== undefined
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                          : 'border-dashed border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                    style={isSelected ? { background: '#6366F1' } : {}}
                  >
                    <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{DUR_LABEL[dur.key] ?? dur.label}</p>
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
                className={`rounded-xl border py-2.5 text-center transition-all active:scale-95 ${
                  selectedDuration === 'custom'
                    ? 'border-transparent text-white'
                    : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400'
                }`}
                style={selectedDuration === 'custom' ? { background: '#6366F1' } : {}}
              >
                <p className="text-xs font-semibold">{t('customDuration')}</p>
                <p className="text-xs mt-0.5 text-slate-300">{t('manualDuration')}</p>
              </button>
            </div>
          </div>

          {/* Preview retour prévu */}
          {selectedDuration && selectedDuration !== 'custom' && (() => {
            const dur = DURATIONS.find(d => d.key === selectedDuration)
            if (!dur) return null
            const returnDate = new Date(Date.now() + dur.hours * 3600000)
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '12px',
                background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)',
                border: '1px solid #c7d2fe',
              }}>
                <CalendarDays size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#3730a3', fontWeight: 600 }}>
                  {t('returnExpected')} {new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(returnDate)}
                </span>
              </div>
            )
          })()}

          {/* Expected return — custom picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('plannedReturn')}</label>

            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setShowReturnPicker(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1.5px solid #e2e8f0', background: '#fff',
                textAlign: 'left', cursor: 'pointer', fontSize: '14px',
                color: form.expectedReturnAt ? '#0f172a' : '#94a3b8',
              }}
            >
              <CalendarDays size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                {form.expectedReturnAt
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(form.expectedReturnAt))
                  : '— —'}
              </span>
              <Clock size={14} style={{ color: '#94a3b8' }} />
            </button>

            {/* Inline picker panel */}
            {showReturnPicker && (
              <div style={{
                marginTop: '8px', borderRadius: '16px', border: '1.5px solid #e2e8f0',
                background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                padding: '16px', userSelect: 'none',
              }}>
                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button type="button"
                    onClick={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
                    <ChevronLeft size={18} style={{ color: '#6366f1' }} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                    {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(pickerMonth)}
                  </span>
                  <button type="button"
                    onClick={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>
                    <ChevronRight size={18} style={{ color: '#6366f1' }} />
                  </button>
                </div>

                {/* Day-of-week headers (Mon first, locale-aware) */}
                {(() => {
                  const baseDate = new Date(2024, 0, 1) // Monday Jan 1 2024
                  return (
                    <div style={{ display: 'flex', marginBottom: '4px' }}>
                      {[0,1,2,3,4,5,6].map(i => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#94a3b8', padding: '2px 0' }}>
                          {new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i)).slice(0, 2)}
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Calendar weeks */}
                {buildCalendar(pickerMonth).map((week, wi) => {
                  const ret = getReturnDate()
                  const today = new Date()
                  return (
                    <div key={wi} style={{ display: 'flex' }}>
                      {week.map((day, di) => {
                        const isSelected = ret &&
                          ret.getFullYear() === pickerMonth.getFullYear() &&
                          ret.getMonth() === pickerMonth.getMonth() &&
                          ret.getDate() === day
                        const isToday = day &&
                          today.getFullYear() === pickerMonth.getFullYear() &&
                          today.getMonth() === pickerMonth.getMonth() &&
                          today.getDate() === day
                        return (
                          <div key={di} style={{ flex: 1, padding: '2px' }}>
                            {day ? (
                              <button type="button" onClick={() => pickDay(day)}
                                style={{
                                  width: '100%', aspectRatio: '1', border: 'none', cursor: 'pointer',
                                  borderRadius: '8px', fontSize: '13px', fontWeight: isSelected ? 700 : 400,
                                  background: isSelected ? '#6366f1' : isToday ? '#eef2ff' : 'transparent',
                                  color: isSelected ? '#fff' : isToday ? '#6366f1' : '#1e293b',
                                }}>
                                {day}
                              </button>
                            ) : <div />}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Divider */}
                <div style={{ margin: '14px 0 12px', borderTop: '1px solid #f1f5f9' }} />

                {/* Time picker */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  {/* Hour stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => pickHour(-1)}
                      style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={14} style={{ color: '#6366f1' }} />
                    </button>
                    <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                      {String(getReturnDate()?.getHours() ?? 12).padStart(2, '0')}
                    </span>
                    <button type="button" onClick={() => pickHour(1)}
                      style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={14} style={{ color: '#6366f1' }} />
                    </button>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#6366f1' }}>:</span>
                  {/* Minute chips */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0, 15, 30, 45].map(m => {
                      const selMin = getReturnDate()?.getMinutes() ?? -1
                      const active = selMin === m
                      return (
                        <button key={m} type="button" onClick={() => pickMinute(m)}
                          style={{
                            padding: '6px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                            border: '1.5px solid', cursor: 'pointer',
                            borderColor: active ? '#6366f1' : '#e2e8f0',
                            background: active ? '#6366f1' : '#f8fafc',
                            color: active ? '#fff' : '#475569',
                          }}>
                          {String(m).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Confirm button */}
                <button type="button" onClick={() => setShowReturnPicker(false)}
                  style={{
                    marginTop: '14px', width: '100%', padding: '10px', borderRadius: '10px',
                    background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '14px',
                  }}>
                  ✓ {t('confirmPicker')}
                </button>
              </div>
            )}
          </div>

          {/* Accessories */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              {t('accessories')}
              {isEscooter && <span className="ml-2 text-red-500 normal-case font-semibold">{t('escooterHelmetNote')}</span>}
            </label>
            <div className="space-y-2">
              {FIXED_ACCESSORIES.map(acc => {
                const qty = accessoryQty[acc.type] ?? 0
                const codes = accessoryCodes[acc.type] ?? []
                const accPrice = acc.pricingKey ? (pricingGrid.accessories?.[acc.pricingKey] ?? 0) : 0
                const accLabel = t(acc.tKey as Parameters<typeof t>[0])
                return (
                  <div key={acc.type} className={`rounded-xl border px-3 py-2.5 transition-colors ${qty > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 flex items-center gap-2">
                        <acc.Icon size={13} className={qty > 0 ? 'text-indigo-500' : 'text-slate-400'} />
                        <span className={qty > 0 ? 'font-semibold text-indigo-700' : 'text-slate-600'}>{accLabel}</span>
                        {accPrice > 0 && <span className="text-xs text-slate-400">+{accPrice} €</span>}
                        {!acc.pricingKey && <span className="text-xs text-emerald-600 font-medium">{t('included')}</span>}
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
                          <input key={i} type="text" placeholder={`${t('lockPlaceholder')}${qty > 1 ? ` ${i + 1}` : ''}`}
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
              <p className="text-xs text-red-500 mt-1.5 font-medium">{t('helmetWarning')}</p>
            )}
          </div>

          {/* Price summary */}
          {calculatedTotal !== null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-sm">{t('calculatedPrice')}</span>
                <span className="font-bold text-base text-emerald-700">{calculatedTotal.toFixed(2)} €</span>
              </div>
              {accessoriesTotal > 0 && (
                <div className="mt-1 text-xs text-emerald-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>{t('base')} ({DURATIONS.find(d => d.key === selectedDuration)?.label})</span>
                    <span>{basePrice?.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('accessories')}</span>
                    <span>+{accessoriesTotal.toFixed(2)} €</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount collected */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500">{t('amountCollected')}</label>
              {calculatedTotal !== null && manualPrice && (
                <button type="button" onClick={() => { setManualPrice(false); setForm(f => ({ ...f, amountPaid: calculatedTotal.toFixed(2) })) }}
                  className="text-xs font-semibold hover:underline" style={{ color: '#6366F1' }}>
                  {t('resetPrice')} {calculatedTotal.toFixed(2)} €
                </button>
              )}
            </div>
            <input type="number" required min="0" step="0.01" value={form.amountPaid}
              onChange={e => { setManualPrice(true); setForm({ ...form, amountPaid: e.target.value }) }}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 transition-colors" />
            {!selectedDuration && !form.amountPaid && (
              <p className="text-xs text-slate-400 mt-1">{t('selectDurationHint')}</p>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">{t('paymentMethod')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'CASH',     label: tPayment('cash'),     Icon: Banknote },
                { value: 'CARD',     label: tPayment('card'),     Icon: CreditCard },
                { value: 'BIZUM',    label: tPayment('bizum'),    Icon: Smartphone },
                { value: 'TRANSFER', label: tPayment('transfer'), Icon: Building2 },
              ].map(pm => (
                <button key={pm.value} type="button" onClick={() => setForm({ ...form, paymentMethod: pm.value })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
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

          {/* Deposit */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">{t('deposit')}</label>

            {/* Toggle Argent / Pièce d'identité */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 3, marginBottom: 12, width: 'fit-content' }}>
              {[
                { value: 'MONEY', label: t('depositMoney'), Icon: Euro },
                { value: 'ID',    label: t('depositId'),    Icon: FileText },
              ].map(opt => {
                const OptIcon = opt.Icon
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setDepositType(opt.value as 'MONEY' | 'ID')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'all .15s',
                      background: depositType === opt.value ? 'white' : 'transparent',
                      color: depositType === opt.value ? '#4f46e5' : '#64748b',
                      boxShadow: depositType === opt.value ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    }}>
                    <OptIcon size={13} /> {opt.label}
                  </button>
                )
              })}
            </div>

            {depositType === 'MONEY' ? (
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.depositAmount}
                  onChange={e => setForm({ ...form, depositAmount: e.target.value })}
                  className={`flex-1 ${INPUT}`} />
                <div className="flex gap-1">
                  {[
                    { value: 'CASH', label: tPayment('cash'), Icon: Banknote },
                    { value: 'CARD', label: tPayment('card'), Icon: CreditCard },
                  ].map(pm => (
                    <button key={pm.value} type="button"
                      onClick={() => setForm({ ...form, depositPaymentMethod: pm.value })}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                        form.depositPaymentMethod === pm.value
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      <pm.Icon size={12} /> {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { value: 'PASSPORT',        label: t('passport') },
                  { value: 'DNI',             label: t('dni') },
                  { value: 'NIE',             label: t('nie') },
                  { value: 'ID_CARD',         label: t('idCard') },
                  { value: 'DRIVING_LICENSE', label: t('drivingLicense') },
                  { value: 'OTHER',           label: t('other') },
                ].map(doc => {
                  const active = depositIdType === doc.value
                  return (
                    <button key={doc.value} type="button"
                      onClick={() => setDepositIdType(doc.value)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 8px', borderRadius: 10,
                        border: `1.5px solid ${active ? '#6366F1' : '#e2e8f0'}`,
                        background: active ? '#eef2ff' : 'white',
                        color: active ? '#4f46e5' : '#64748b',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                      }}>
                      <FileText size={12} />
                      {doc.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          <button onClick={() => { setStepDir('fwd'); setStep(4) }} disabled={!canNextStep3}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
            style={{ background: '#6366F1' }}>
            {t('continueSig')}
          </button>
        </div>
      )}

      {/* ─── STEP 4 — SIGNATURE ─── */}
      {step === 4 && (
        <div key="s4" className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-4 ${stepDir === 'fwd' ? 'step-enter-fwd' : 'step-enter-bwd'}`}>
          <h2 className="font-semibold text-slate-900 text-sm">{t('signatureTitle')}</h2>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1.5">
            <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">{t('summary')}</p>
            <p className="text-slate-500 text-xs">{t('step1')} : <span className="text-slate-800 font-medium">
              {newCustomer ? `${customerForm.firstName} ${customerForm.lastName}` : customers.find(c => c.id === form.customerId)?.firstName + ' ' + customers.find(c => c.id === form.customerId)?.lastName}
            </span></p>
            <p className="text-slate-500 text-xs">{t('step2')}{selectedBikeIds.length > 1 ? 's' : ''} : <span className="text-slate-800 font-medium">
              {selectedBikeIds.map(id => {
                const b = bikes.find(x => x.id === id)
                return b ? `${b.name} (${b.code})` : id
              }).join(' · ')}
            </span></p>
            {selectedDuration && selectedDuration !== 'custom' && (
              <p className="text-slate-500 text-xs">{t('rentalDuration')} : <span className="text-slate-800 font-medium">{DURATIONS.find(d => d.key === selectedDuration)?.label}</span></p>
            )}
            <p className="text-slate-500 text-xs">{t('amountPaid')} : <span className="font-bold text-emerald-600">{form.amountPaid} € — {tPayment(form.paymentMethod.toLowerCase() as Parameters<typeof tPayment>[0])}</span></p>
            {depositType === 'MONEY' && Number(form.depositAmount) > 0 && (
              <p className="text-slate-500 text-xs">{t('deposit')} : <span className="text-slate-800 font-medium">{form.depositAmount} € — {tPayment(form.depositPaymentMethod.toLowerCase() as Parameters<typeof tPayment>[0])}</span></p>
            )}
            {depositType === 'ID' && (
              <p className="text-slate-500 text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('deposit')} : <FileText size={12} color="#4f46e5" style={{ flexShrink: 0 }} />
                <span className="text-indigo-700 font-semibold">{depositIdType.replace('_', ' ')}</span>
              </p>
            )}
            {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0).length > 0 && (
              <p className="text-slate-500 text-xs">{t('accessories')} : <span className="text-slate-800 font-medium">
                {FIXED_ACCESSORIES.filter(a => (accessoryQty[a.type] ?? 0) > 0)
                  .map(a => {
                    const codes = accessoryCodes[a.type] ?? []
                    const codeStr = codes.filter(Boolean).length > 0 ? ` (${codes.filter(Boolean).join(', ')})` : ''
                    return `${accessoryQty[a.type]}× ${t(a.tKey as Parameters<typeof t>[0])}${codeStr}`
                  }).join(' · ')}
              </span></p>
            )}
          </div>

          {/* Terms */}
          {!hasReadTerms ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                📋 {t('termsTitle')}
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
              <p className="text-xs text-slate-400 text-center mt-2">{t('scrollToSign')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <Check size={14} className="text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">{t('termsRead')}</p>
              </div>

              {/* ── Signature client ── */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{t('signHere')}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {newCustomer ? `${customerForm.firstName} ${customerForm.lastName}` : customers.find(c => c.id === form.customerId)?.firstName + ' ' + customers.find(c => c.id === form.customerId)?.lastName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {clientSigned && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px' }}>✓ Signé</span>}
                    <button type="button" onClick={() => { clientPadRef.current?.clear(); setClientSigned(false) }}
                      style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {t('clear')}
                    </button>
                  </div>
                </div>
                <SignaturePad
                  ref={clientPadRef}
                  onChange={notEmpty => setClientSigned(notEmpty)}
                  placeholder={t('signWithFinger')}
                />
              </div>

              {/* ── Signature staff ── */}
              <div style={{ background: '#fafbff', border: '1.5px solid #c7d2fe', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#4338ca' }}>Signature responsable / Staff</p>
                    <p style={{ fontSize: 11, color: '#a5b4fc', marginTop: 2 }}>Engagement du loueur</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {staffSigned && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px' }}>✓ Signé</span>}
                    <button type="button" onClick={() => { staffPadRef.current?.clear(); setStaffSigned(false) }}
                      style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {t('clear')}
                    </button>
                  </div>
                </div>
                <SignaturePad
                  ref={staffPadRef}
                  color="#4338ca"
                  onChange={notEmpty => setStaffSigned(notEmpty)}
                  placeholder="Signature du responsable / Staff signature"
                />
              </div>

              {!clientSigned && !staffSigned && (
                <p className="text-xs text-slate-400 text-center">{t('signWithFinger')}</p>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading || !clientSigned || !staffSigned}
            className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#6366F1' }}>
            {loading ? t('creating') : <><Check size={15} />{t('confirmOpen')}</>}
          </button>
        </div>
      )}

      {/* ─── SUCCESS OVERLAY ─── */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        }}>
          <style>{`
            @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
            @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
            .success-pop { animation: popIn 0.4s cubic-bezier(.34,1.56,.64,1) both }
            .success-text { animation: fadeUp 0.3s 0.3s both }
          `}</style>
          <div className="success-pop" style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          }}>
            <Check size={36} color="#fff" strokeWidth={3} />
          </div>
          <p className="success-text" style={{ marginTop: 20, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {t('successTitle')}
          </p>
          <p className="success-text" style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
            {t('successSub')}
          </p>
        </div>
      )}
    </div>
  )
}
