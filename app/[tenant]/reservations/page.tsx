'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CalendarDays, Phone, Mail, Bike, Check, ArrowRight } from 'lucide-react'

interface Bike {
  id: string
  name: string
  code: string
  dailyRate: number
  status: string
}

const BIKE_TYPE_LABEL: Record<string, string> = {
  CITY: 'Vélo de ville', ELECTRIC: 'Électrique', MOUNTAIN: 'VTT',
  ROAD: 'Route', CARGO: 'Cargo', KIDS: 'Enfant', ESCOOTER: 'Trottinette',
}

interface Reservation {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  bikeId: string | null
  bikeType: string | null
  startAt: string
  endAt: string
  notes: string | null
  status: string
  createdAt: string
  bike?: { name: string; code: string } | null
}

const STATUS = {
  PENDING: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-600' },
  CONVERTED: { label: 'Convertie', color: 'bg-blue-100 text-blue-700' },
}

export default function ReservationsPage() {
  const params = useParams()
  const router = useRouter()
  const tenant = params.tenant as string

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    bikeId: '',
    startAt: '',
    endAt: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/reservations').then(r => r.json()),
      fetch('/api/bikes').then(r => r.json()),
    ]).then(([res, bk]) => {
      setReservations(Array.isArray(res) ? res : [])
      setBikes(Array.isArray(bk) ? bk : [])
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerName || !form.startAt || !form.endAt) {
      setError('Nom, date de début et date de fin sont requis.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setReservations(prev => [data, ...prev])
    setShowForm(false)
    setForm({ customerName: '', customerPhone: '', customerEmail: '', bikeId: '', startAt: '', endAt: '', notes: '' })
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  async function convertToRental(reservation: Reservation) {
    router.push(`/${tenant}/rentals/new?reservationId=${reservation.id}`)
  }

  const pending = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')
  const past = reservations.filter(r => r.status === 'CANCELLED' || r.status === 'CONVERTED')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pending.length} en attente</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle réservation
        </button>
      </div>

      {/* New reservation form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 mb-2">Nouvelle réservation</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 font-medium block mb-1">Nom du client *</label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Début *</label>
              <input
                type="datetime-local"
                required
                value={form.startAt}
                onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Fin *</label>
              <input
                type="datetime-local"
                required
                value={form.endAt}
                onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 font-medium block mb-1">Vélo (optionnel)</label>
              <select
                value={form.bikeId}
                onChange={e => setForm(f => ({ ...f, bikeId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Pas encore assigné —</option>
                {bikes.filter(b => b.status === 'AVAILABLE' || true).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code}) — {Number(b.dailyRate).toFixed(2)} €/j</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
              {saving ? 'Enregistrement...' : 'Créer la réservation'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Chargement...</div>
      ) : (
        <>
          {/* Pending / Confirmed */}
          {pending.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 mb-6">
              <div className="flex justify-center mb-2"><CalendarDays size={24} className="text-gray-300" /></div>
              <p className="text-sm">Aucune réservation en attente</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pending.map(r => {
                const st = STATUS[r.status as keyof typeof STATUS]
                return (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{r.customerName}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {r.customerPhone && <p className="flex items-center gap-1"><Phone size={11} className="text-gray-400" />{r.customerPhone}</p>}
                          {r.customerEmail && <p className="flex items-center gap-1"><Mail size={11} className="text-gray-400" />{r.customerEmail}</p>}
                          <p className="flex items-center gap-1">
                            <CalendarDays size={11} className="text-gray-400" />
                            {new Date(r.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} →{' '}
                            {new Date(r.endAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          {r.bikeType && <p className="flex items-center gap-1"><Bike size={11} className="text-gray-400" />{BIKE_TYPE_LABEL[r.bikeType] ?? r.bikeType}</p>}
                          {r.bike && <p className="flex items-center gap-1"><Bike size={11} className="text-gray-400" />{r.bike.name} ({r.bike.code})</p>}
                          {r.notes && <p className="text-gray-400 italic">{r.notes}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {r.status === 'PENDING' && (
                          <button onClick={() => updateStatus(r.id, 'CONFIRMED')}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                            <Check size={12} className="inline mr-1" />Confirmer
                          </button>
                        )}
                        <button onClick={() => convertToRental(r)}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1">
                          <Bike size={12} />Louer <ArrowRight size={11} />
                        </button>
                        <button onClick={() => updateStatus(r.id, 'CANCELLED')}
                          className="text-xs text-red-500 hover:underline">
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Historique</h2>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {past.map(r => {
                  const st = STATUS[r.status as keyof typeof STATUS]
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{r.customerName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.startAt).toLocaleDateString('fr-FR')} → {new Date(r.endAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
