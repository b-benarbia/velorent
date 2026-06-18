'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bike, ArrowRight, Check } from 'lucide-react'

const FEATURES = [
  'Gestion de flotte complète',
  'Contrats avec signature digitale',
  'Tableau de bord temps réel',
  'Multi-vélos & accessoires',
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ shopName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push(`/${data.slug}/dashboard`)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[440px] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: '#0F172A' }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern" />
        {/* Radial glows */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}
          >
            <Bike size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">VeloRent</span>
        </div>

        {/* Pitch */}
        <div className="relative">
          <p className="text-[28px] font-semibold text-white leading-snug tracking-tight mb-3">
            Votre shop en ligne<br />en 2 minutes.
          </p>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#475569' }}>
            Flotte, locations, contrats, cautions —<br />tout est prêt dès la création de votre compte.
          </p>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={f} className="flex items-center gap-3" style={{ animation: `fadeUp 0.4s ease ${i * 60}ms both` }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <Check size={10} style={{ color: '#818cf8' }} />
                </div>
                <span className="text-sm" style={{ color: '#94a3b8' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badge */}
        <div className="relative">
          <span
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Gratuit · Sans carte bancaire
          </span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm" style={{ animation: 'fadeUp 0.4s ease both' }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)' }}>
              <Bike size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-base">VeloRent</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Créer votre shop</h1>
          <p className="text-sm text-slate-400 mb-8">Gratuit · Prêt en 2 minutes</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nom du shop</label>
              <input
                type="text"
                required
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-400"
                placeholder="Épicerie du Vélo"
                style={{ transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-400"
                placeholder="vous@votreshop.com"
                style={{ transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-400"
                placeholder="8 caractères minimum"
                style={{ transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'box-shadow 0.2s, opacity 0.15s, transform 0.1s',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Création...
                </>
              ) : (
                <>Créer mon shop <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-400">
              Déjà un compte ?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: '#6366F1' }}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
