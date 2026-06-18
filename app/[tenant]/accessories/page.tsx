'use client'

import { useState, useEffect } from 'react'

interface Accessory {
  id: string
  type: string
  name: string
  code: string | null
  status: string
  notes: string | null
}

const TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  LOCK:       { label: 'Cadenas',       icon: '🔒' },
  HELMET:     { label: 'Casque',        icon: '⛑️' },
  CHARGER:    { label: 'Chargeur',      icon: '🔌' },
  BASKET:     { label: 'Panier',        icon: '🧺' },
  CHILD_SEAT: { label: 'Siège enfant',  icon: '👶' },
  OTHER:      { label: 'Autre',         icon: '📦' },
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  RENTED:      'bg-blue-100 text-blue-700',
  LOST:        'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponible', RENTED: 'En location', LOST: 'Perdu', MAINTENANCE: 'Maintenance',
}

export default function AccessoriesPage() {
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'LOCK', name: '', code: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accessories').then(r => r.json()).then(data => {
      setAccessories(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/accessories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setAccessories(prev => [...prev, data])
    setForm({ type: 'LOCK', name: '', code: '', notes: '' })
    setShowForm(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet accessoire ?')) return
    await fetch(`/api/accessories/${id}`, { method: 'DELETE' })
    setAccessories(prev => prev.filter(a => a.id !== id))
  }

  async function toggleStatus(acc: Accessory) {
    if (acc.status === 'RENTED') return // ne pas toucher manuellement
    const next = acc.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE'
    const res = await fetch(`/api/accessories/${acc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) setAccessories(prev => prev.map(a => a.id === acc.id ? { ...a, status: next } : a))
  }

  const grouped = Object.keys(TYPE_LABEL).map(type => ({
    type,
    items: accessories.filter(a => a.type === type),
  })).filter(g => g.items.length > 0)

  const available = accessories.filter(a => a.status === 'AVAILABLE').length
  const rented = accessories.filter(a => a.status === 'RENTED').length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accessoires</h1>
          <p className="text-sm text-gray-500 mt-0.5">{available} disponible{available !== 1 ? 's' : ''} · {rented} en location</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Ajouter
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Nouvel accessoire</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, name: TYPE_LABEL[e.target.value]?.label ?? '' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Nom *</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Casque rouge #3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Code / Numéro <span className="text-gray-400">(optionnel)</span></label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="ex: K-42"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40">
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Chargement...</div>
      ) : accessories.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-sm">Aucun accessoire enregistré</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ type, items }) => {
            const { label, icon } = TYPE_LABEL[type]
            return (
              <div key={type} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">{icon} {label} <span className="text-gray-400 font-normal">({items.length})</span></p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{acc.name}</p>
                        {acc.code && <p className="text-xs font-mono text-gray-400">#{acc.code}</p>}
                        {acc.notes && <p className="text-xs text-gray-400 italic">{acc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(acc)}
                          disabled={acc.status === 'RENTED'}
                          title={acc.status !== 'RENTED' ? 'Changer statut' : 'En location'}
                          className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer disabled:cursor-default ${STATUS_COLOR[acc.status] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          {STATUS_LABEL[acc.status] ?? acc.status}
                        </button>
                        <button onClick={() => handleDelete(acc.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
