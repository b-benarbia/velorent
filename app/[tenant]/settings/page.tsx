'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Bike, Zap, Mountain, Package, Heart, Flag, Gauge,
  Shield, BatteryCharging, ShoppingBasket,
  Info, Users, Eye, EyeOff, CheckCircle2, Waves, Activity,
  Sparkles, Store, Percent, Lock, MessageCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface StaffMember { id: string; name: string; email: string; createdAt: string }

const DURATIONS = [
  { key: '1h',    label: '1h' },
  { key: '2h',    label: '2h' },
  { key: '4h',    label: '4h' },
  { key: '1day',  label: '1 day' },
  { key: '24h',   label: '24h' },
  { key: '2days', label: '2j' },
  { key: '3days', label: '3j' },
  { key: '4days', label: '4j' },
  { key: '5days', label: '5j' },
  { key: '6days', label: '6j' },
  { key: 'week',  label: 'Sem.' },
  { key: 'extra', label: '+1j' },
] as const

// Multipliers relative to the 1day rate
const DURATION_MULTIPLIERS: Record<string, number> = {
  '1h':    0.20,
  '2h':    0.35,
  '4h':    0.55,
  '1day':  1.00,
  '24h':   1.00,
  '2days': 1.80,
  '3days': 2.50,
  '4days': 3.20,
  '5days': 4.00,
  '6days': 4.80,
  'week':  6.00,
  'extra': 0.85,
}

const BIKE_TYPES = [
  { key: 'CITY',     label: 'City',      Icon: Bike },
  { key: 'ELECTRIC', label: 'Electric',  Icon: Zap },
  { key: 'MOUNTAIN', label: 'Mountain',  Icon: Mountain },
  { key: 'ESCOOTER', label: 'E-Scooter', Icon: Gauge },
  { key: 'CARGO',    label: 'Cargo',     Icon: Package },
  { key: 'KIDS',     label: 'Kids',      Icon: Heart },
  { key: 'ROAD',     label: 'Road',      Icon: Flag },
  { key: 'TANDEM',   label: 'Tandem',    Icon: Users },
  { key: 'FATBIKE',  label: 'Fat Bike',  Icon: Waves },
  { key: 'EMTB',     label: 'E-MTB',     Icon: Activity },
] as const

const ACCESSORIES = [
  { key: 'HELMET',     label: 'Casque',      Icon: Shield },
  { key: 'CHILD_SEAT', label: 'Siège enfant', Icon: Heart },
  { key: 'CHARGER',    label: 'Chargeur',    Icon: BatteryCharging },
  { key: 'BASKET',     label: 'Panier',      Icon: ShoppingBasket },
]

type DurationKey = typeof DURATIONS[number]['key']
type BikeTypeKey = typeof BIKE_TYPES[number]['key']
type AccKey = 'HELMET' | 'CHILD_SEAT' | 'CHARGER' | 'BASKET'
type PricingGrid = { [B in BikeTypeKey]?: { [D in DurationKey]?: number } } & { accessories?: { [A in AccKey]?: number } }

interface ShopInfo {
  name: string
  address: string
  phone: string
  email: string
  website: string
  taxRate: number
  currency: string
  depositConfig: Record<string, number>
}

// ─── Shared UI primitives ────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24, overflow: 'hidden' }
const cardHead: React.CSSProperties = { padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 13px', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }

function SectionIcon({ gradient, icon }: { gradient: string; icon: React.ReactNode }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 9, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
  )
}

function SaveBtn({ onClick, loading, saved, error, label }: { onClick: () => void; loading: boolean; saved: boolean; error: string; label: string }) {
  const bg = saved ? '#f0fdf4' : error ? '#fef2f2' : 'linear-gradient(135deg,#6366F1,#8b5cf6)'
  const color = saved ? '#16a34a' : error ? '#dc2626' : 'white'
  const border = saved ? '1px solid #bbf7d0' : error ? '1px solid #fecaca' : 'none'
  return (
    <button onClick={onClick} disabled={loading}
      style={{ background: bg, color, border, borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
      {saved ? <><CheckCircle2 size={14} /> Sauvegardé</> : error ? '⚠️ Erreur' : loading ? 'Sauvegarde…' : label}
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const params = useParams()
  const tenant = params.tenant as string
  const t = useTranslations('settings')

  // ── Staff ──
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [staffSuccess, setStaffSuccess] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })

  // ── Pricing ──
  const [pricing, setPricing] = useState<PricingGrid>({})
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSaved, setPricingSaved] = useState(false)
  const [pricingError, setPricingError] = useState('')
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())

  // ── Shop ──
  const [shop, setShop] = useState<ShopInfo>({ name: '', address: '', phone: '', email: '', website: '', taxRate: 21, currency: 'EUR', depositConfig: {} })
  const [shopLoading, setShopLoading] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)
  const [shopError, setShopError] = useState('')

  // ── Stripe ──
  const [stripe, setStripe] = useState({ stripePublishableKey: '', stripeSecretKey: '', stripeSecretKeyMasked: '', hasStripeSecret: false })
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeSaved, setStripeSaved] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const [showStripeSecret, setShowStripeSecret] = useState(false)

  // ── Notifications ──
  const [notif, setNotif] = useState({ notifLocale: 'es', notifWhatsapp: '' })
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifError, setNotifError] = useState('')

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/staff')
    if (res.ok) setStaff(await res.json())
  }, [])

  const loadPricing = useCallback(async () => {
    const res = await fetch('/api/settings/pricing')
    if (res.ok) setPricing(await res.json())
  }, [])

  const loadShop = useCallback(async () => {
    const res = await fetch('/api/settings/shop')
    if (res.ok) {
      const data = await res.json()
      setShop({
        name: data.name ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        taxRate: Number(data.taxRate ?? 21),
        currency: data.currency ?? 'EUR',
        depositConfig: data.depositConfig ?? {},
      })
    }
  }, [])

  const loadStripe = useCallback(async () => {
    const res = await fetch('/api/settings/payments')
    if (res.ok) {
      const data = await res.json()
      setStripe({ stripePublishableKey: data.stripePublishableKey ?? '', stripeSecretKey: '', stripeSecretKeyMasked: data.stripeSecretKeyMasked ?? '', hasStripeSecret: data.hasStripeSecret ?? false })
    }
  }, [])

  const loadNotif = useCallback(async () => {
    const res = await fetch('/api/settings/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotif({ notifLocale: data.notifLocale ?? 'es', notifWhatsapp: data.notifWhatsapp ?? '' })
    }
  }, [])

  async function saveNotif() {
    setNotifLoading(true); setNotifError('')
    try {
      const res = await fetch('/api/settings/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif) })
      if (res.ok) { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 3000) }
      else { const d = await res.json(); setNotifError(d.error ?? 'Erreur') }
    } catch { setNotifError('Erreur réseau') }
    setNotifLoading(false)
  }

  async function saveStripe() {
    setStripeLoading(true); setStripeError('')
    try {
      const res = await fetch('/api/settings/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripePublishableKey: stripe.stripePublishableKey, stripeSecretKey: stripe.stripeSecretKey }),
      })
      if (res.ok) { setStripeSaved(true); setStripe(s => ({ ...s, stripeSecretKey: '', hasStripeSecret: true })); setTimeout(() => setStripeSaved(false), 3000); loadStripe() }
      else { const d = await res.json(); setStripeError(d.error ?? 'Erreur') }
    } catch { setStripeError('Erreur réseau') }
    setStripeLoading(false)
  }

  useEffect(() => { loadStaff(); loadPricing(); loadShop(); loadStripe(); loadNotif() }, [loadStaff, loadPricing, loadShop, loadStripe, loadNotif])

  // ── Pricing helpers ──
  function setPrice(bikeType: BikeTypeKey, duration: DurationKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    const key = `${bikeType}:${duration}`
    setAutoFilled(prev => { const s = new Set(prev); s.delete(key); return s })
    setPricing(prev => ({ ...prev, [bikeType]: { ...(prev[bikeType] ?? {}), [duration]: num } }))
  }

  function autoFillRow(bikeType: BikeTypeKey) {
    const baseDaily = pricing[bikeType]?.['1day']
    if (!baseDaily) return
    const filled: Record<string, number> = {}
    const newKeys = new Set(autoFilled)
    DURATIONS.forEach(d => {
      if (d.key === '1day') return
      const mult = DURATION_MULTIPLIERS[d.key] ?? 1
      const val = Math.round(baseDaily * mult * 100) / 100
      filled[d.key] = val
      newKeys.add(`${bikeType}:${d.key}`)
    })
    setAutoFilled(newKeys)
    setPricing(prev => ({ ...prev, [bikeType]: { ...(prev[bikeType] ?? {}), ...filled } }))
  }

  function setAccessoryPrice(acc: AccKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    setPricing(prev => ({ ...prev, accessories: { ...(prev.accessories ?? {}), [acc]: num } }))
  }

  async function savePricing() {
    setPricingLoading(true); setPricingError('')
    try {
      const res = await fetch('/api/settings/pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pricing) })
      if (res.ok) { setPricingSaved(true); setTimeout(() => setPricingSaved(false), 3000) }
      else { const d = await res.json(); setPricingError(d.error ?? 'Erreur') }
    } catch { setPricingError('Erreur réseau') }
    setPricingLoading(false)
  }

  // ── Shop helpers ──
  function setDeposit(type: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value)
    setShop(prev => ({ ...prev, depositConfig: { ...prev.depositConfig, [type]: num } }))
  }

  async function saveShop() {
    setShopLoading(true); setShopError('')
    try {
      const res = await fetch('/api/settings/shop', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shop) })
      if (res.ok) { setShopSaved(true); setTimeout(() => setShopSaved(false), 3000) }
      else { const d = await res.json(); setShopError(d.error ?? 'Erreur') }
    } catch { setShopError('Erreur réseau') }
    setShopLoading(false)
  }

  // ── Staff helpers ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setStaffLoading(true); setStaffError(''); setStaffSuccess('')
    const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setStaffError(data.error) }
    else { setStaffSuccess(t('accountCreated') + form.email); setForm({ firstName: '', lastName: '', email: '', password: '' }); setShowForm(false); loadStaff() }
    setStaffLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('confirmDelete', { name }))) return
    await fetch('/api/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadStaff()
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <style>{`
        .settings-shop-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
        @media (min-width: 480px) { .settings-shop-grid { grid-template-columns: 1fr 1fr; } }
        .settings-deposit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 640px) { .settings-deposit-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px) { .settings-deposit-grid { grid-template-columns: repeat(5, 1fr); } }
        .settings-acc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .settings-acc-grid { grid-template-columns: repeat(4, 1fr); } }
        .settings-card-padding { padding: 18px; }
        @media (min-width: 640px) { .settings-card-padding { padding: 24px; } }
      `}</style>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{t('title')}</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{t('subtitle')}</p>
      </div>

      {/* ═══════════════════════════════════════════════════
          1. BOUTIQUE
      ═══════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#f59e0b,#f97316)" icon={<Store size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('shopTitle')}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('shopSubtitle')}</p>
            </div>
          </div>
          <SaveBtn onClick={saveShop} loading={shopLoading} saved={shopSaved} error={shopError} label="Sauvegarder" />
        </div>

        <div className="settings-card-padding">
          <div className="settings-shop-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{t('shopNameLabel')}</label>
              <input value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))}
                placeholder="BikeAlao Marítim" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('shopPhoneLabel')}</label>
              <input value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))}
                placeholder="+34 600 000 000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('shopEmailLabel')}</label>
              <input type="email" value={shop.email} onChange={e => setShop(s => ({ ...s, email: e.target.value }))}
                placeholder="contact@boutique.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('shopAddressLabel')}</label>
              <input value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))}
                placeholder="Calle del Mar 12, Valencia" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('shopWebsiteLabel')}</label>
              <input value={shop.website} onChange={e => setShop(s => ({ ...s, website: e.target.value }))}
                placeholder="https://votreboutique.com" style={inputStyle} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Info size={11} /> Slug : <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>{tenant}</span> — {t('slugNote')}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          2. TVA + CAUTION
      ═══════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#10b981,#059669)" icon={<Percent size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('taxTitle')}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('taxSubtitle')}</p>
            </div>
          </div>
          <SaveBtn onClick={saveShop} loading={shopLoading} saved={shopSaved} error={shopError} label="Sauvegarder" />
        </div>

        <div className="settings-card-padding">
          {/* TVA */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>{t('taxRateLabel')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 160 }}>
                <input type="number" min="0" max="100" step="0.1"
                  value={shop.taxRate}
                  onChange={e => setShop(s => ({ ...s, taxRate: parseFloat(e.target.value) || 0 }))}
                  style={{ ...inputStyle, paddingRight: 30 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', pointerEvents: 'none' }}>%</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>{t('taxHint')}</p>
            </div>
          </div>

          {/* Caution par type */}
          <div>
            <label style={labelStyle}>{t('depositLabel')}</label>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{t('depositHint')}</p>
            <div className="settings-deposit-grid">
              {BIKE_TYPES.map(bt => {
                const BtIcon = bt.Icon
                const val = shop.depositConfig[bt.key] ?? ''
                return (
                  <div key={bt.key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <BtIcon size={12} color="#94a3b8" /> {bt.label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" inputMode="decimal" placeholder="0"
                        value={val === 0 ? '' : val}
                        onChange={e => setDeposit(bt.key, e.target.value.replace(/[^0-9.]/g, ''))}
                        style={{ ...inputStyle, paddingRight: 24, fontSize: 14, fontWeight: 600 }} />
                      <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#cbd5e1', pointerEvents: 'none' }}>€</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#fafbff', borderRadius: 10, border: '1px solid #e0e7ff', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Lock size={13} color="#6366F1" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#6366F1' }}>{t('depositNote')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          3. GRILLE TARIFAIRE
      ═══════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#6366F1,#8b5cf6)" icon={<Zap size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('pricing')}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('pricingSubtitleNew')}</p>
            </div>
          </div>
          <SaveBtn onClick={savePricing} loading={pricingLoading} saved={pricingSaved} error={pricingError} label="Sauvegarder" />
        </div>

        {pricingError && <div style={{ padding: '8px 24px', background: '#fef2f2', fontSize: 12, color: '#dc2626' }}>{pricingError}</div>}

        <div className="settings-card-padding" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', paddingBottom: 10, paddingRight: 12, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 130 }}>{t('vehicleCol')}</th>
                {DURATIONS.map(d => (
                  <th key={d.key} style={{ paddingBottom: 10, paddingInline: 5, textAlign: 'center', fontSize: 11, fontWeight: 700, color: d.key === '1day' ? '#6366F1' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 68 }}>
                    {d.label}
                    {d.key === '1day' && <div style={{ fontSize: 9, color: '#a5b4fc', fontWeight: 600, marginTop: 1 }}>{t('baseCol')}</div>}
                  </th>
                ))}
                <th style={{ paddingBottom: 10, paddingInline: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 60 }}>Auto</th>
              </tr>
            </thead>
            <tbody>
              {BIKE_TYPES.map((bike, idx) => {
                const BkIcon = bike.Icon
                const baseDaily = pricing[bike.key]?.['1day']
                const canAuto = !!baseDaily
                return (
                  <tr key={bike.key} style={{ borderBottom: idx < BIKE_TYPES.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ paddingBlock: 7, paddingRight: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <BkIcon size={13} color="#94a3b8" /> {bike.label}
                      </span>
                    </td>
                    {DURATIONS.map(dur => {
                      const isBase = dur.key === '1day'
                      const isAutoFilled = autoFilled.has(`${bike.key}:${dur.key}`)
                      const val = pricing[bike.key]?.[dur.key]
                      return (
                        <td key={dur.key} style={{ paddingBlock: 5, paddingInline: 4 }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text" inputMode="decimal" placeholder="—"
                              autoComplete="off" autoCorrect="off" spellCheck={false}
                              value={val ?? ''}
                              onChange={e => setPrice(bike.key, dur.key, e.target.value.replace(/[^0-9.]/g, ''))}
                              style={{
                                width: '100%', border: `1px solid ${isBase ? '#c7d2fe' : isAutoFilled ? '#e0f2fe' : '#e2e8f0'}`,
                                borderRadius: 8, padding: '6px 18px 6px 6px', textAlign: 'center',
                                fontSize: 13, fontWeight: 600,
                                color: isBase ? '#4f46e5' : isAutoFilled ? '#0284c7' : '#0f172a',
                                background: isBase ? '#fafaff' : isAutoFilled ? '#f0f9ff' : 'white',
                                outline: 'none', boxSizing: 'border-box' as const,
                              }}
                            />
                            <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#cbd5e1', pointerEvents: 'none' }}>€</span>
                          </div>
                        </td>
                      )
                    })}
                    <td style={{ paddingBlock: 5, paddingInline: 4, textAlign: 'center' }}>
                      <button
                        onClick={() => autoFillRow(bike.key)}
                        disabled={!canAuto}
                        title={canAuto ? 'Calculer automatiquement depuis le tarif journalier' : 'Entrez d\'abord le tarif journalier (1 day)'}
                        style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: canAuto ? 'linear-gradient(135deg,#6366F1,#8b5cf6)' : '#f1f5f9',
                          border: 'none', cursor: canAuto ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Sparkles size={14} color={canAuto ? 'white' : '#cbd5e1'} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 10, padding: '10px 14px', background: '#fafbff', borderRadius: 10, border: '1px solid #e0e7ff', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Sparkles size={13} color="#6366F1" />
            <p style={{ fontSize: 12, color: '#6366F1' }}>{t('pricingTip')}</p>
          </div>
        </div>

        {/* Accessories */}
        <div className="settings-card-padding" style={{ paddingTop: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{t('accessories')}</p>
          <div className="settings-acc-grid">
            {ACCESSORIES.map(acc => {
              const AccIcon = acc.Icon
              return (
                <div key={acc.key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <AccIcon size={12} color="#94a3b8" /> {acc.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" inputMode="decimal" placeholder="0" autoComplete="off" spellCheck={false}
                      value={pricing.accessories?.[acc.key as AccKey] ?? ''}
                      onChange={e => setAccessoryPrice(acc.key as AccKey, e.target.value.replace(/[^0-9.]/g, ''))}
                      style={{ ...inputStyle, paddingRight: 26, fontSize: 14, fontWeight: 600 }} />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#cbd5e1', pointerEvents: 'none' }}>€</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#cbd5e1', marginTop: 5 }}>{t('perRental')}</p>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={11} /> {t('lockIncluded')}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          4. NOTIFICATIONS IA — WHATSAPP
      ═══════════════════════════════════════════════════ */}
      {/* ── Paiements Stripe ── */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#635BFF,#7C3AED)" icon={<Lock size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('stripeTitle')}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('stripeSubtitle')}</p>
            </div>
          </div>
          <SaveBtn onClick={saveStripe} loading={stripeLoading} saved={stripeSaved} error={stripeError} label={t('save')} />
        </div>

        <div className="settings-card-padding">
          {/* Banner */}
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #c4b5fd', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Lock size={15} color="#7C3AED" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#5b21b6', marginBottom: 3 }}>{t('stripeBannerTitle')}</p>
              <p style={{ fontSize: 12, color: '#6d28d9', lineHeight: 1.6 }}>{t('stripeBannerText')}</p>
            </div>
          </div>

          <div className="settings-shop-grid">
            {/* Clé publique */}
            <div>
              <label style={labelStyle}>{t('stripePublicKeyLabel')} <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(pk_live_... ou pk_test_...)</span></label>
              <input
                value={stripe.stripePublishableKey}
                onChange={e => setStripe(s => ({ ...s, stripePublishableKey: e.target.value }))}
                placeholder="pk_live_..."
                style={inputStyle}
              />
            </div>

            {/* Clé secrète */}
            <div>
              <label style={labelStyle}>{t('stripeSecretKeyLabel')} <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(sk_live_... ou sk_test_...)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showStripeSecret ? 'text' : 'password'}
                  value={stripe.stripeSecretKey || (stripe.hasStripeSecret && !showStripeSecret ? stripe.stripeSecretKeyMasked : '')}
                  onChange={e => setStripe(s => ({ ...s, stripeSecretKey: e.target.value }))}
                  onFocus={() => { if (stripe.hasStripeSecret) setStripe(s => ({ ...s, stripeSecretKey: '' })) }}
                  placeholder={stripe.hasStripeSecret ? t('stripeSecretPlaceholder') : 'sk_live_...'}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowStripeSecret(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                >
                  {showStripeSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {stripe.hasStripeSecret && (
                <p style={{ fontSize: 11, color: '#16a34a', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> {t('stripeSecretConfigured')}
                </p>
              )}
            </div>
          </div>

          {/* Lien dashboard Stripe */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fafbff', borderRadius: 10, border: '1px solid #e0e7ff', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, color: '#6366F1' }}>{t('stripeNoAccount')}</p>
            <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: '#635BFF', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t('stripeCreateAccount')}
            </a>
          </div>
        </div>
      </div>

      {/* ── Notifications WhatsApp ── */}
      <div style={card}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#25D366,#128C7E)" icon={<MessageCircle size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('notifTitle')}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('notifSubtitle')}</p>
            </div>
          </div>
          <SaveBtn onClick={saveNotif} loading={notifLoading} saved={notifSaved} error={notifError} label={t('save')} />
        </div>

        <div className="settings-card-padding">
          {/* Banner info */}
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <MessageCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 3 }}>{t('notifBannerTitle')}</p>
              <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>{t('notifBannerText')}</p>
            </div>
          </div>

          <div className="settings-shop-grid">
            {/* Numéro WhatsApp */}
            <div>
              <label style={labelStyle}>{t('notifPhoneLabel')}</label>
              <input
                value={notif.notifWhatsapp}
                onChange={e => setNotif(n => ({ ...n, notifWhatsapp: e.target.value }))}
                placeholder={t('notifPhonePlaceholder')}
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{t('notifPhoneHint')}</p>
            </div>

            {/* Langue du briefing */}
            <div>
              <label style={labelStyle}>{t('notifLocaleLabel')}</label>
              <select
                value={notif.notifLocale}
                onChange={e => setNotif(n => ({ ...n, notifLocale: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇬🇧 English</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="it">🇮🇹 Italiano</option>
                <option value="nl">🇳🇱 Nederlands</option>
                <option value="pt">🇵🇹 Português</option>
              </select>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{t('notifLocaleHint')}</p>
            </div>
          </div>

          {/* Note auto-detect */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#fafbff', borderRadius: 10, border: '1px solid #e0e7ff', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Sparkles size={13} color="#6366F1" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#6366F1', lineHeight: 1.6 }}>{t('notifAutoDetect')}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          5. STAFF
      ═══════════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SectionIcon gradient="linear-gradient(135deg,#64748b,#475569)" icon={<Users size={16} color="white" />} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('staffAccount')} ({staff.length})</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('staffSubtitle')}</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ background: showForm ? '#f1f5f9' : 'linear-gradient(135deg,#6366F1,#8b5cf6)', color: showForm ? '#64748b' : 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? t('cancel') : t('createAccount')}
          </button>
        </div>

        <div style={{ padding: '10px 24px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info size={13} color="#6366F1" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            {t('staffInfo')} <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>staff@votreboutique.com</span> — page de connexion : <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>/login</span>
          </p>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="settings-card-padding" style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbff' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>{t('newStaff')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>{t('firstName')}</label>
                <input type="text" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('lastName')}</label>
                <input type="text" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{t('loginEmail')}</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@votreboutique.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('minPassword')} style={{ ...inputStyle, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {staffError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{staffError}</p>}
            <button type="submit" disabled={staffLoading}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: staffLoading ? 'not-allowed' : 'pointer', opacity: staffLoading ? 0.6 : 1 }}>
              {staffLoading ? t('creating') : t('createStaff')}
            </button>
          </form>
        )}

        {staffSuccess && (
          <div style={{ padding: '12px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} color="#16a34a" /> {staffSuccess}
          </div>
        )}

        {staff.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('noStaff')}</div>
        ) : (
          <div>
            {staff.map((s, i) => (
              <div key={s.id} style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6366F1' }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{s.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>Staff</span>
                  <button onClick={() => handleDelete(s.id, s.name)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {t('deleteStaff')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
