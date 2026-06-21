'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const RunivoMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <rect x="3" y="3" width="2.5" height="12" rx="1.25" fill="white" />
    <path d="M8.5 5L13.5 9L8.5 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FEATURES = [
  { text: 'Gestion de flotte complète', sub: 'Vélos, statuts, maintenance' },
  { text: 'Réservations & contrats digitaux', sub: 'Signature en ligne, cautions auto' },
  { text: 'Tableau de bord temps réel', sub: 'KPIs, CA, retards — tout en un coup d\'œil' },
  { text: 'IA intégrée & WhatsApp', sub: 'Briefing matinal, relances clients automatiques' },
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
        className="hidden lg:flex lg:w-[480px] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: '#0A1628' }}
      >
        {/* Teal radial glow */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.14) 0%, transparent 65%)', transform: 'translate(-40%, -40%)' }}
        />
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
            Lancez-vous.<br />
            <span style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Prêt en 2 minutes.
            </span>
          </p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#64748B' }}>
            Votre espace de gestion est configuré dès l'inscription. Aucune carte bancaire requise.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={f.text} className="flex items-start gap-3" style={{ animation: `fadeUp 0.4s ease ${i * 60}ms both` }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.35)' }}
                >
                  <Check size={10} style={{ color: '#2DD4BF' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-tight">{f.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative">
          <div
            className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>
              Gratuit · Sans carte bancaire · Prêt en 2 minutes
            </span>
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

          <h1 className="text-[26px] font-bold text-slate-900 mb-1.5" style={{ letterSpacing: '-0.03em' }}>Créer votre espace</h1>
          <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>Gratuit · Prêt en 2 minutes · Aucune carte bancaire</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-2">
                Nom de votre enseigne
              </label>
              <input
                type="text"
                required
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-300"
                placeholder="Épicerie du Vélo"
                style={{ borderColor: '#E2E8F0', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              />
            </div>

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
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-slate-900 placeholder-slate-300"
                placeholder="8 caractères minimum"
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
                  Création en cours…
                </>
              ) : (
                <>Créer mon espace <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              Déjà un compte ?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: '#0D9488' }}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
