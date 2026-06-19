'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CalendarDays, Phone, Mail, Bike, Check, ArrowRight, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Bike {
  id: string
  name: string
  code: string
  dailyRate: number
  status: string
}

const BIKE_TYPE_LABEL: Record<string, string> = {
  CITY: 'City', ELECTRIC: 'Electric', MOUNTAIN: 'Mountain',
  ROAD: 'Road', CARGO: 'Cargo', KIDS: 'Kids', ESCOOTER: 'E-Scooter',
  TANDEM: 'Tandem', FATBIKE: 'Fat Bike', EMTB: 'E-MTB',
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

const STATUS_COLOR = {
  PENDING:   'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-500',
  CONVERTED: 'bg-indigo-50 text-indigo-600',
}

const INPUT_CLASS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900'

export default function ReservationsPage() {
  const params = useParams()
  const router = useRouter()
  const tenant = params.tenant as string
  const t = useTranslations('reservations')
  const tStatus = useTranslations('status')

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cancelModal, setCancelModal] = useState<{ id: string; name: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')

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
      setError(t('error'))
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

  async function updateStatus(id: string, status: string, cancelReason?: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancelReason }),
    })
    if (res.ok) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  async function handleCancel() {
    if (!cancelModal) return
    await updateStatus(cancelModal.id, 'CANCELLED', cancelReason.trim() || undefined)
    setCancelModal(null)
    setCancelReason('')
  }

  async function convertToRental(reservation: Reservation) {
    router.push(`/${tenant}/rentals/new?reservationId=${reservation.id}`)
  }

  const pending = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')
  const past = reservations.filter(r => r.status === 'CANCELLED' || r.status === 'CONVERTED')

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{t('cancelModalTitle')}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{cancelModal.name}</p>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-semibold text-slate-500 block mb-2">{t('cancelReasonLabel')} <span className="font-normal text-slate-400">{t('cancelReasonHint')}</span></label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={t('cancelReasonPlaceholder')}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400 resize-none text-slate-900 placeholder-slate-300"
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#ef4444' }}
              >
                {t('confirmCancel')}
              </button>
              <button
                onClick={() => { setCancelModal(null); setCancelReason('') }}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {t('back')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{pending.length} {t('pending').toLowerCase()}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity"
          style={{ background: '#6366F1' }}
        >
          <Plus size={15} /> {t('new')}
        </button>
      </div>

      {/* New reservation form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm mb-2">{t('new')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('customerName')} *</label>
              <input type="text" required value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                className={INPUT_CLASS} placeholder="First Last" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('phone') || 'Phone'}</label>
              <input type="tel" value={form.customerPhone}
                onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">Email</label>
              <input type="email" value={form.customerEmail}
                onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('start')} *</label>
              <input type="datetime-local" required value={form.startAt}
                onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('end')} *</label>
              <input type="datetime-local" required value={form.endAt}
                onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                className={INPUT_CLASS} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('bikeOptional')}</label>
              <select value={form.bikeId} onChange={e => setForm(f => ({ ...f, bikeId: e.target.value }))} className={INPUT_CLASS}>
                <option value="">— —</option>
                {bikes.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code}) — {Number(b.dailyRate).toFixed(2)} €/j</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-semibold block mb-1">{t('notes') || 'Notes'}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className={`${INPUT_CLASS} resize-none`} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: '#6366F1' }}>
              {saving ? t('saving') : t('new')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-12">{t('loading') || 'Loading...'}</div>
      ) : (
        <>
          {pending.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center mb-6">
              <div className="flex justify-center mb-2"><CalendarDays size={24} className="text-slate-200" /></div>
              <p className="text-sm text-slate-400">{t('noPending')}</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pending.map(r => {
                const stColor = STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] ?? 'bg-slate-50 text-slate-500'
                const stLabel = tStatus(r.status.toLowerCase() as Parameters<typeof tStatus>[0])
                return (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-semibold text-slate-900 text-sm">{r.customerName}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stColor}`}>{stLabel}</span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          {r.customerPhone && <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-300 flex-shrink-0" />{r.customerPhone}</p>}
                          {r.customerEmail && <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-300 flex-shrink-0" />{r.customerEmail}</p>}
                          <p className="flex items-center gap-1.5">
                            <CalendarDays size={11} className="text-slate-300 flex-shrink-0" />
                            {new Date(r.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} →{' '}
                            {new Date(r.endAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          {r.bikeType && <p className="flex items-center gap-1.5"><Bike size={11} className="text-slate-300 flex-shrink-0" />{BIKE_TYPE_LABEL[r.bikeType] ?? r.bikeType}</p>}
                          {r.bike && <p className="flex items-center gap-1.5"><Bike size={11} className="text-slate-300 flex-shrink-0" />{r.bike.name} ({r.bike.code})</p>}
                          {r.notes && <p className="text-slate-400 italic">{r.notes}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {r.status === 'PENDING' && (
                          <button onClick={() => updateStatus(r.id, 'CONFIRMED')}
                            className="text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
                            style={{ background: '#10b981' }}>
                            <Check size={11} />{t('confirm')}
                          </button>
                        )}
                        <button onClick={() => convertToRental(r)}
                          className="text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
                          style={{ background: '#6366F1' }}>
                          <Bike size={11} />{t('convert')} <ArrowRight size={10} />
                        </button>
                        <button onClick={() => setCancelModal({ id: r.id, name: r.customerName })}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('history')}</p>
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-50 overflow-hidden">
                {past.map(r => {
                  const stColor = STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] ?? 'bg-slate-50 text-slate-500'
                  const stLabel = tStatus(r.status.toLowerCase() as Parameters<typeof tStatus>[0])
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{r.customerName}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(r.startAt).toLocaleDateString('fr-FR')} → {new Date(r.endAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${stColor}`}>{stLabel}</span>
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
