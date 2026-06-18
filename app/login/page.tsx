'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bike } from 'lucide-react'

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
            Gérez votre flotte<br />en toute simplicité.
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Location de vélos, réservations, contrats et facturation — tout en un.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: '#1e293b', color: '#94a3b8' }}>B</div>
          <div>
            <p className="text-sm font-medium text-white">Bilal · Épicerie du Vélo</p>
            <p className="text-xs" style={{ color: '#475569' }}>Shop connecté · Tenerife</p>
          </div>
        </div>
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

          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Connexion</h1>
          <p className="text-sm text-slate-400 mb-8">Accédez à votre tableau de bord</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white text-slate-900 transition-colors"
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: '#6366F1' }}>
              Créer votre shop
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
