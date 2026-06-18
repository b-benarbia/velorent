'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bike } from 'lucide-react'

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
      {/* Left panel — navy */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between px-12 py-10" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#6366F1' }}>
            <Bike size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">VeloRent</span>
        </div>

        <div>
          <p className="text-3xl font-semibold text-white leading-snug tracking-tight mb-3">
            Votre shop en ligne<br />en 2 minutes.
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Flotte, locations, contrats, cautions — tout est prêt dès la création de votre compte.
          </p>
          <div className="mt-6 space-y-2">
            {['Gestion de flotte complète', 'Contrats avec signature digitale', 'Tableau de bord en temps réel'].map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#6366F1' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="text-sm" style={{ color: '#94a3b8' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: '#334155' }}>
          Déjà plus de 10 shops actifs sur VeloRent
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6366F1' }}>
              <Bike size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-base">VeloRent</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Créer votre shop</h1>
          <p className="text-sm text-slate-400 mb-8">Gratuit, sans carte bancaire</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom du shop</label>
              <input
                type="text"
                required
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 placeholder-slate-400 transition-colors"
                placeholder="Épicerie du Vélo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 placeholder-slate-400 transition-colors"
                placeholder="vous@votreshop.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 placeholder-slate-400 transition-colors"
                placeholder="8 caractères minimum"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-opacity mt-2"
              style={{ background: '#6366F1' }}
            >
              {loading ? 'Création...' : 'Créer mon shop →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: '#6366F1' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
