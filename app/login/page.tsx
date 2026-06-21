'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const RunivoMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <rect x="3" y="3" width="2.5" height="12" rx="1.25" fill="white" />
    <path d="M8.5 5L13.5 9L8.5 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FEATURES = [
  { label: 'Réservations en ligne', desc: 'Calendrier intégré avec paiement Stripe' },
  { label: 'Contrats digitaux', desc: 'Signature et cautions gérées automatiquement' },
  { label: 'IA opérationnelle', desc: 'Briefing matinal, relances clients, conseils météo' },
  { label: 'Multi-boutiques', desc: 'Gérez plusieurs emplacements depuis un seul compte' },
]

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
        className="hidden lg:flex lg:w-[480px] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: '#0A1628' }}
      >
        {/* Teal radial glow — top left */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.14) 0%, transparent 65%)', transform: 'translate(-40%, -40%)' }}
        />
        {/* Cyan glow — bottom right */}
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.08) 0%, transparent 65%)', transform: 'translate(35%, 35%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 0 20px rgba(13,148,136,0.45)' }}
          >
            <RunivoMark size={18} />
          </div>
          <span className="text-white font-semibold text-lg" style={{ letterSpacing: '-0.025em' }}>Runivo</span>
        </div>

        {/* Pitch */}
        <div className="relative">
          <p className="text-[32px] font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            Gérez votre flotte.<br />
            <span style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Développez votre activité.
            </span>
          </p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#64748B' }}>
            La plateforme tout-en-un pour les loueurs de vélos qui veulent aller plus loin.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <CheckCircle2 size={15} style={{ color: '#0D9488' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-tight">{f.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat bar */}
        <div className="relative">
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>+340%</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>réservations en ligne</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="text-center">
                <p className="text-xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>-2h</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>de gestion / jour</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#2DD4BF', letterSpacing: '-0.03em' }}>7 pays</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>déjà présents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[360px]" style={{ animation: 'fadeUp 0.4s ease both' }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
              <RunivoMark size={16} />
            </div>
            <span className="font-semibold text-slate-900 text-base" style={{ letterSpacing: '-0.02em' }}>Runivo</span>
          </div>

          <h1 className="text-[26px] font-bold text-slate-900 mb-1.5" style={{ letterSpacing: '-0.03em' }}>Bon retour</h1>
          <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>Connectez-vous à votre espace Runivo</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-2">
                Adresse e-mail
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-300"
                placeholder="vous@runivo.app"
                style={{ borderColor: '#E2E8F0', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-slate-900"
                style={{ borderColor: '#E2E8F0', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-red-600 text-sm rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              style={{
                background: loading ? '#0F766E' : 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(13,148,136,0.4)',
                transition: 'box-shadow 0.2s, opacity 0.15s, transform 0.1s',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Connexion en cours…
                </>
              ) : (
                <>Se connecter <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: '#0D9488' }}>
                Créer votre espace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
