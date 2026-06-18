'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bike, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
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
        {/* Radial glow */}
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
            Gérez votre flotte<br />en toute simplicité.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
            Location de vélos, réservations, contrats<br />et facturation — tout en un.
          </p>

          {/* Feature pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['Contrats digitaux', 'Multi-vélos', 'Tableau de bord', 'Cautions'].map(f => (
              <span
                key={f}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: '#1e293b', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            B
          </div>
          <div>
            <p className="text-sm font-medium text-white">Bilal · Épicerie du Vélo</p>
            <p className="text-xs" style={{ color: '#334155' }}>Tenerife · actif</p>
          </div>
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

          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Bon retour 👋</h1>
          <p className="text-sm text-slate-400 mb-8">Connectez-vous à votre espace shop</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Mot de passe</label>
              </div>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-900"
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
                  Connexion...
                </>
              ) : (
                <>Se connecter <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-400">
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: '#6366F1' }}>
                Créer votre shop
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
