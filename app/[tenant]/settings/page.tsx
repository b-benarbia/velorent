'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Bike, Zap, Mountain, Package, Heart, Flag, Gauge,
  Shield, BatteryCharging, ShoppingBasket,
  Info, Trash2, UserPlus,
} from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string
  createdAt: string
}

// ─── Types tarif ───────────────────────────────────
const DURATIONS = [
  { key: '1h',    label: '1h' },
  { key: '2h',    label: '2h' },
  { key: '4h',    label: '4h' },
  { key: '1day',  label: '1 jour' },
  { key: '24h',   label: '24h' },
  { key: '2days', label: '2 jours' },
  { key: '3days', label: '3 jours' },
  { key: '4days', label: '4 jours' },
  { key: '5days', label: '5 jours' },
  { key: '6days', label: '6 jours' },
  { key: 'week',  label: 'Semaine' },
  { key: 'extra', label: '+1j extra' },
] as const

const BIKE_TYPES = [
  { key: 'CITY',     label: 'Vélo ville',      Icon: Bike },
  { key: 'ELECTRIC', label: 'Vélo électrique', Icon: Zap },
  { key: 'MOUNTAIN', label: 'VTT',             Icon: Mountain },
  { key: 'ESCOOTER', label: 'Trottinette',     Icon: Gauge },
  { key: 'CARGO',    label: 'Cargo',           Icon: Package },
  { key: 'KIDS',     label: 'Enfant',          Icon: Heart },
  { key: 'ROAD',     label: 'Vélo route',      Icon: Flag },
] as const

const ACCESSORIES = [
  { key: 'HELMET',     label: 'Casque',       Icon: Shield },
  { key: 'CHILD_SEAT', label: 'Siège enfant', Icon: Heart },
  { key: 'CHARGER',    label: 'Chargeur',     Icon: BatteryCharging },
  { key: 'BASKET',     label: 'Panier',       Icon: ShoppingBasket },
]

type DurationKey = typeof DURATIONS[number]['key']
type BikeTypeKey = typeof BIKE_TYPES[number]['key']
type AccKey = 'HELMET' | 'CHILD_SEAT' | 'CHARGER' | 'BASKET'

type PricingGrid = {
  [B in BikeTypeKey]?: { [D in DurationKey]?: number }
} & {
  accessories?: { [A in AccKey]?: number }
}

// ────────────────────────────────────────────────────
export default function SettingsPage() {
  const params = useParams()
  const tenant = params.tenant as string

  // ── Staff ──
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })

  // ── Tarifs ──
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

  // ── Helpers tarif ──
  function setPrice(bikeType: BikeTypeKey, duration: DurationKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    setPricing(prev => ({
      ...prev,
      [bikeType]: {
        ...(prev[bikeType] ?? {}),
        [duration]: num,
      },
    }))
  }

  function setAccessoryPrice(acc: AccKey, value: string) {
    const num = value === '' ? undefined : parseFloat(value)
    setPricing(prev => ({
      ...prev,
      accessories: {
        ...(prev.accessories ?? {}),
        [acc]: num,
      },
    }))
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
        setPricingError(data.error ?? `Erreur ${res.status}`)
      }
    } catch {
      setPricingError('Erreur réseau')
    }
    setPricingLoading(false)
  }

  // ── Staff actions ──
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
      setSuccess(`Compte créé pour ${data.name}`)
      setForm({ firstName: '', lastName: '', email: '', password: '' })
      setShowForm(false)
      loadStaff()
    }
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le compte de ${name} ?`)) return
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadStaff()
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

      {/* ─── TARIFS ─── */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Grille tarifaire</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Saisissez vos tarifs une seule fois — ils se calculent automatiquement lors de chaque location
            </p>
          </div>
          <button
            onClick={savePricing}
            disabled={pricingLoading}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {pricingLoading ? 'Sauvegarde...' : pricingSaved ? '✅ Sauvegardé !' : pricingError ? '❌ Erreur' : 'Sauvegarder'}
          </button>
        </div>

        {pricingError && (
          <div className="px-4 pt-2 pb-0 text-sm text-red-600 font-medium">{pricingError}</div>
        )}
        {/* Tableau tarifs vélos */}
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                  Véhicule
                </th>
                {DURATIONS.map(d => (
                  <th key={d.key} className="pb-2 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {BIKE_TYPES.map(bike => (
                <tr key={bike.key} className="hover:bg-gray-50/50">
                  <td className="py-2 pr-4">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <bike.Icon size={14} className="text-gray-400 flex-shrink-0" />
                      {bike.label}
                    </span>
                  </td>
                  {DURATIONS.map(dur => (
                    <td key={dur.key} className="py-2 px-2">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="—"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={pricing[bike.key]?.[dur.key] ?? ''}
                          onChange={e => {
                            const v = e.target.value.replace(/[^0-9.]/g, '')
                            setPrice(bike.key, dur.key, v)
                          }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm text-gray-900 font-medium
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            placeholder-gray-300"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none">€</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accessoires */}
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Accessoires
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACCESSORIES.map(acc => (
              <div key={acc.key} className="border border-gray-200 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <acc.Icon size={13} className="text-gray-400" /> {acc.label}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={pricing.accessories?.[acc.key as AccKey] ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.]/g, '')
                      setAccessoryPrice(acc.key as AccKey, v)
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 font-medium
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">€</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">par location</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <Info size={12} className="text-gray-300 flex-shrink-0" />
            Le cadenas est inclus dans le prix (pas de frais séparé). Laissez vide si un accessoire est offert.
          </p>
        </div>
      </div>

      {/* ─── STAFF ─── */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Équipe ({staff.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">Les comptes staff peuvent gérer les locations mais pas les paramètres</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Ajouter
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="p-4 border-b border-gray-100 bg-blue-50 space-y-3">
            <p className="text-sm font-medium text-blue-900">Nouveau compte staff</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                <input type="text" required value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" required value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input type="password" required minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 caractères"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Création...' : 'Créer le compte'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-gray-500 text-sm px-4 py-2 rounded-lg hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </form>
        )}

        {success && (
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 text-sm text-green-700 font-medium">
            ✅ {success}
          </div>
        )}

        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Aucun compte staff — ajoutez vos stagiaires ici
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <button onClick={() => handleDelete(s.id, s.name)}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline">
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── INFOS SHOP ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-1">Boutique</h2>
        <p className="text-sm text-gray-500">Slug : <span className="font-mono text-gray-700">{tenant}</span></p>
        <p className="text-xs text-gray-400 mt-2">Pour modifier le nom ou les infos du shop, contactez le support VeloRent.</p>
      </div>
    </div>
  )
}
