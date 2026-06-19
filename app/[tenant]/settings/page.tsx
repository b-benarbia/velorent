'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Bike, Zap, Mountain, Package, Heart, Flag, Gauge,
  Shield, BatteryCharging, ShoppingBasket,
  Info, Users, Eye, EyeOff, CheckCircle2, Waves, Activity,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface StaffMember {
  id: string
  name: string
  email: string
  createdAt: string
}

const DURATIONS = [
  { key: '1h',    label: '1h' },
  { key: '2h',    label: '2h' },
  { key: '4h',    label: '4h' },
  { key: '1day',  label: '1 day' },
  { key: '24h',   label: '24h' },
  { key: '2days', label: '2 days' },
  { key: '3days', label: '3 days' },
  { key: '4days', label: '4 days' },
  { key: '5days', label: '5 days' },
  { key: '6days', label: '6 days' },
  { key: 'week',  label: 'Week' },
  { key: 'extra', label: '+1d' },
] as const

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
  { key: 'HELMET',     label: 'Helmet',     Icon: Shield },
  { key: 'CHILD_SEAT', label: 'Child seat', Icon: Heart },
  { key: 'CHARGER',    label: 'Charger',    Icon: BatteryCharging },
  { key: 'BASKET',     label: 'Basket',     Icon: ShoppingBasket },
]

type DurationKey = typeof DURATIONS[number]['key']
type BikeTypeKey = typeof BIKE_TYPES[number]['key']
type AccKey = 'HELMET' | 'CHILD_SEAT' | 'CHARGER' | 'BASKET'

type PricingGrid = {
  [B in BikeTypeKey]?: { [D in DurationKey]?: number }
} & {
  accessories?: { [A in AccKey]?: number }
}

export default function SettingsPage() {
  const params = useParams()
  const tenant = params.tenant as string
  const t = useTranslations('settings')

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })

  const [pricing, setPricing] = useState<PricingGrid>({})
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSaved, setPricingSaved] = useState(false)
  const [pricingError, setPricingError] = useState('')

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/staff')
    if (res.ok) setStaff(await res.json())
  }, [])

  const loadPricing = useCallback(async () => {
    const res = await fetch('/api/settings/pricing')
    if (res.ok) setPricing(await res.json())
  }, [])

  useEffect(() => {
    loadStaff()
    loadPricing()
  }, [loadStaff, loadPricing])

  function setPrice(bikeType: BikeTypeKey, duration: DurationKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    setPricing(prev => ({ ...prev, [bikeType]: { ...(prev[bikeType] ?? {}), [duration]: num } }))
  }

  function setAccessoryPrice(acc: AccKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    setPricing(prev => ({ ...prev, accessories: { ...(prev.accessories ?? {}), [acc]: num } }))
  }

  async function savePricing() {
    setPricingLoading(true)
    setPricingError('')
    try {
      const res = await fetch('/api/settings/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      })
      if (res.ok) {
        setPricingSaved(true)
        setTimeout(() => setPricingSaved(false), 3000)
      } else {
        const data = await res.json()
        setPricingError(data.error ?? `${t('errorStatus')} ${res.status}`)
      }
    } catch {
      setPricingError(t('networkError'))
    }
    setPricingLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess(t('accountCreated') + form.email)
      setForm({ firstName: '', lastName: '', email: '', password: '' })
      setShowForm(false)
      loadStaff()
    }
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('confirmDelete', { name }))) return
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadStaff()
  }

  const cardStyle = {
    background: 'white',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    marginBottom: 20,
    overflow: 'hidden' as const,
  }

  const cardHeaderStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{t('title')}</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{t('subtitle')}</p>
      </div>

      {/* ─── STAFF ACCOUNT ─── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366F1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('staffAccount')} ({staff.length})</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{t('staffSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? '#f1f5f9' : 'linear-gradient(135deg,#6366F1,#8b5cf6)',
              color: showForm ? '#64748b' : 'white',
              border: 'none', borderRadius: 10, padding: '8px 16px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {showForm ? t('cancel') : t('createAccount')}
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: '12px 20px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={14} color="#6366F1" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            {t('staffInfo')} <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>staff@yourshop.com</span> — <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>/login</span>
          </p>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{ padding: 20, borderBottom: '1px solid #f1f5f9', background: '#fafbff' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>{t('newStaff')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('firstName')}</label>
                <input type="text" required value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('lastName')}</label>
                <input type="text" required value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('loginEmail')}</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="staff@yourshop.com"
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required minLength={6} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={t('minPassword')}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 40px 8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? t('creating') : t('createStaff')}
            </button>
          </form>
        )}

        {success && (
          <div style={{ padding: '12px 20px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} color="#16a34a" />
            {success}
          </div>
        )}

        {staff.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            {t('noStaff')}
          </div>
        ) : (
          <div>
            {staff.map((s, i) => (
              <div key={s.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6366F1' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{s.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>Staff</span>
                  <button onClick={() => handleDelete(s.id, s.name)}
                    style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {t('deleteStaff')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── PRICING ─── */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('pricing')}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t('pricingSubtitle')}</p>
          </div>
          <button
            onClick={savePricing}
            disabled={pricingLoading}
            style={{
              background: pricingSaved ? '#f0fdf4' : 'linear-gradient(135deg,#6366F1,#8b5cf6)',
              color: pricingSaved ? '#16a34a' : 'white',
              border: pricingSaved ? '1px solid #bbf7d0' : 'none',
              borderRadius: 10, padding: '8px 16px',
              fontSize: 12, fontWeight: 600, cursor: pricingLoading ? 'not-allowed' : 'pointer',
              opacity: pricingLoading ? 0.6 : 1,
            }}
          >
            {pricingLoading ? t('saving') : pricingSaved ? `✅ ${t('saved')}` : pricingError ? `❌ ${t('errorStatus')}` : t('save')}
          </button>
        </div>

        {pricingError && (
          <div style={{ padding: '8px 20px', background: '#fef2f2', fontSize: 12, color: '#dc2626' }}>{pricingError}</div>
        )}

        <div style={{ padding: 20, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', paddingBottom: 8, paddingRight: 16, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 130 }}>{t('vehicle')}</th>
                {DURATIONS.map(d => (
                  <th key={d.key} style={{ paddingBottom: 8, paddingInline: 6, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 72 }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BIKE_TYPES.map(bike => (
                <tr key={bike.key} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ paddingBlock: 8, paddingRight: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <bike.Icon size={13} color="#94a3b8" />
                      {bike.label}
                    </span>
                  </td>
                  {DURATIONS.map(dur => (
                    <td key={dur.key} style={{ paddingBlock: 6, paddingInline: 4 }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text" inputMode="decimal" placeholder="—"
                          autoComplete="off" autoCorrect="off" spellCheck={false}
                          value={pricing[bike.key]?.[dur.key] ?? ''}
                          onChange={e => setPrice(bike.key, dur.key, e.target.value.replace(/[^0-9.]/g, ''))}
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 18px 6px 6px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#cbd5e1', pointerEvents: 'none' }}>€</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t('accessories')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {ACCESSORIES.map(acc => (
              <div key={acc.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  <acc.Icon size={12} color="#94a3b8" /> {acc.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" inputMode="decimal" placeholder="0"
                    autoComplete="off" spellCheck={false}
                    value={pricing.accessories?.[acc.key as AccKey] ?? ''}
                    onChange={e => setAccessoryPrice(acc.key as AccKey, e.target.value.replace(/[^0-9.]/g, ''))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 22px 6px 10px', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#cbd5e1', pointerEvents: 'none' }}>€</span>
                </div>
                <p style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>{t('perRental')}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={11} /> {t('lockIncluded')}
          </p>
        </div>
      </div>

      {/* ─── SHOP INFO ─── */}
      <div style={{ ...cardStyle, marginBottom: 0 }}>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{t('shop')}</p>
          <p style={{ fontSize: 13, color: '#64748b' }}>{t('slug')} : <span style={{ fontFamily: 'monospace', color: '#6366F1' }}>{tenant}</span></p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{t('contactSupport')}</p>
        </div>
      </div>
    </div>
  )
}
