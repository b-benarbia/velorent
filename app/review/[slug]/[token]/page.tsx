'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

const T: Record<string, Record<string, string>> = {
  fr: {
    title: 'Comment était votre expérience ?',
    subtitle: 'Votre avis nous aide à nous améliorer',
    thanksGood: 'Merci {name} !',
    subtitleGood: 'Un avis Google prend 30 secondes et aide d\'autres cyclistes à nous trouver.',
    openGoogle: 'Laisser un avis sur Google',
    redirecting: 'Google Maps s\'ouvre dans',
    redirectNow: 'Ouvrir maintenant',
    noPlaceId: 'Merci pour votre note !',
    thanksBad: 'On est désolés',
    subtitleBad: 'Votre retour reste privé. Il nous aide à corriger ce qui n\'a pas fonctionné.',
    feedbackPlaceholder: 'Dites-nous ce qui s\'est passé…',
    sendFeedback: 'Envoyer mon retour',
    sent: 'Reçu, merci.',
    sentSub: 'Nous allons corriger ça.',
    alreadyDone: 'Avis déjà envoyé',
    alreadyDoneHint: 'Merci pour votre retour.',
    loading: 'Chargement…',
    error: 'Lien invalide ou expiré',
    tapStar: 'Touchez pour noter',
    poweredBy: 'VeloRent',
  },
  en: {
    title: 'How was your experience?',
    subtitle: 'Your feedback helps us improve',
    thanksGood: 'Thank you {name}!',
    subtitleGood: 'A Google review takes 30 seconds and helps other cyclists find us.',
    openGoogle: 'Leave a review on Google',
    redirecting: 'Google Maps opens in',
    redirectNow: 'Open now',
    noPlaceId: 'Thanks for your rating!',
    thanksBad: 'We\'re sorry about that',
    subtitleBad: 'Your feedback is private and helps us fix what went wrong.',
    feedbackPlaceholder: 'Tell us what happened…',
    sendFeedback: 'Send feedback',
    sent: 'Received, thank you.',
    sentSub: 'We\'ll work on it.',
    alreadyDone: 'Review already submitted',
    alreadyDoneHint: 'Thank you for your feedback.',
    loading: 'Loading…',
    error: 'Invalid or expired link',
    tapStar: 'Tap to rate',
    poweredBy: 'VeloRent',
  },
  es: {
    title: '¿Cómo fue tu experiencia?',
    subtitle: 'Tu opinión nos ayuda a mejorar',
    thanksGood: '¡Gracias {name}!',
    subtitleGood: 'Comparte tu experiencia para que otros viajeros nos descubran.',
    openGoogle: 'Dejar una reseña en Google',
    redirecting: 'Google Maps se abre en',
    redirectNow: 'Abrir ahora',
    noPlaceId: '¡Gracias por tu valoración!',
    thanksBad: 'Lo sentimos mucho',
    subtitleBad: 'Tu opinión es privada y nos ayuda a corregir lo que falló.',
    feedbackPlaceholder: 'Cuéntanos qué pasó…',
    sendFeedback: 'Enviar mi opinión',
    sent: 'Recibido, gracias.',
    sentSub: 'Lo mejoraremos.',
    alreadyDone: 'Reseña ya enviada',
    alreadyDoneHint: 'Gracias por tu opinión.',
    loading: 'Cargando…',
    error: 'Enlace inválido o expirado',
    tapStar: 'Toca para valorar',
    poweredBy: 'VeloRent',
  },
  de: {
    title: 'Wie war Ihre Erfahrung?',
    subtitle: 'Ihr Feedback hilft uns, besser zu werden',
    thanksGood: 'Danke {name}!',
    subtitleGood: 'Teilen Sie Ihre Erfahrung, damit andere Reisende uns entdecken.',
    openGoogle: 'Google-Bewertung schreiben',
    redirecting: 'Google Maps öffnet in',
    redirectNow: 'Jetzt öffnen',
    noPlaceId: 'Danke für Ihre Bewertung!',
    thanksBad: 'Das tut uns leid',
    subtitleBad: 'Ihr Feedback bleibt privat und hilft uns zu verbessern.',
    feedbackPlaceholder: 'Erzählen Sie uns, was passiert ist…',
    sendFeedback: 'Feedback senden',
    sent: 'Erhalten, danke.',
    sentSub: 'Wir arbeiten daran.',
    alreadyDone: 'Bewertung bereits abgegeben',
    alreadyDoneHint: 'Danke für Ihr Feedback.',
    loading: 'Laden…',
    error: 'Ungültiger oder abgelaufener Link',
    tapStar: 'Tippen zum Bewerten',
    poweredBy: 'VeloRent',
  },
  it: {
    title: 'Com\'è stata la tua esperienza?',
    subtitle: 'Il tuo feedback ci aiuta a migliorare',
    thanksGood: 'Grazie {name}!',
    subtitleGood: 'Condividi la tua esperienza per aiutare altri viaggiatori a scoprirci.',
    openGoogle: 'Lascia una recensione su Google',
    redirecting: 'Google Maps si apre tra',
    redirectNow: 'Apri ora',
    noPlaceId: 'Grazie per la tua valutazione!',
    thanksBad: 'Siamo spiacenti',
    subtitleBad: 'Il tuo feedback è privato e ci aiuta a correggere i problemi.',
    feedbackPlaceholder: 'Dicci cos\'è successo…',
    sendFeedback: 'Invia il mio feedback',
    sent: 'Ricevuto, grazie.',
    sentSub: 'Ci lavoreremo.',
    alreadyDone: 'Recensione già inviata',
    alreadyDoneHint: 'Grazie per il tuo feedback.',
    loading: 'Caricamento…',
    error: 'Link non valido o scaduto',
    tapStar: 'Tocca per valutare',
    poweredBy: 'VeloRent',
  },
  nl: {
    title: 'Hoe was uw ervaring?',
    subtitle: 'Uw feedback helpt ons verbeteren',
    thanksGood: 'Bedankt {name}!',
    subtitleGood: 'Deel uw ervaring om andere reizigers te helpen ons te ontdekken.',
    openGoogle: 'Google-beoordeling schrijven',
    redirecting: 'Google Maps opent over',
    redirectNow: 'Nu openen',
    noPlaceId: 'Bedankt voor uw beoordeling!',
    thanksBad: 'Het spijt ons',
    subtitleBad: 'Uw feedback blijft privé en helpt ons te verbeteren.',
    feedbackPlaceholder: 'Vertel ons wat er is gebeurd…',
    sendFeedback: 'Feedback verzenden',
    sent: 'Ontvangen, bedankt.',
    sentSub: 'We gaan ermee aan de slag.',
    alreadyDone: 'Beoordeling al ingediend',
    alreadyDoneHint: 'Bedankt voor uw feedback.',
    loading: 'Laden…',
    error: 'Ongeldige of verlopen link',
    tapStar: 'Tik om te beoordelen',
    poweredBy: 'VeloRent',
  },
  pt: {
    title: 'Como foi a sua experiência?',
    subtitle: 'O seu feedback ajuda-nos a melhorar',
    thanksGood: 'Obrigado {name}!',
    subtitleGood: 'Partilhe a sua experiência para ajudar outros viajantes a descobrir-nos.',
    openGoogle: 'Deixar avaliação no Google',
    redirecting: 'Google Maps abre em',
    redirectNow: 'Abrir agora',
    noPlaceId: 'Obrigado pela sua avaliação!',
    thanksBad: 'Lamentamos muito',
    subtitleBad: 'O seu feedback é privado e ajuda-nos a corrigir o que correu mal.',
    feedbackPlaceholder: 'Diga-nos o que aconteceu…',
    sendFeedback: 'Enviar feedback',
    sent: 'Recebido, obrigado.',
    sentSub: 'Vamos melhorar.',
    alreadyDone: 'Avaliação já enviada',
    alreadyDoneHint: 'Obrigado pelo seu feedback.',
    loading: 'A carregar…',
    error: 'Link inválido ou expirado',
    tapStar: 'Toque para avaliar',
    poweredBy: 'VeloRent',
  },
}

// Animated SVG face — no emoji
function FaceSVG({ stars, hovered }: { stars: number | null; hovered: number | null }) {
  const n = hovered ?? stars ?? 0
  const configs: Record<number, { bg: string; stroke: string; mouth: string }> = {
    0: { bg: '#FEF9C3', stroke: '#D97706', mouth: 'M18 32 Q26 38 34 32' },
    1: { bg: '#FEE2E2', stroke: '#DC2626', mouth: 'M18 34 Q26 28 34 34' },
    2: { bg: '#FEF3C7', stroke: '#D97706', mouth: 'M18 33 Q26 29 34 33' },
    3: { bg: '#F1F5F9', stroke: '#94A3B8', mouth: 'M18 32 L34 32' },
    4: { bg: '#FEF9C3', stroke: '#D97706', mouth: 'M18 32 Q26 38 34 32' },
    5: { bg: '#DCFCE7', stroke: '#16a34a', mouth: 'M17 31 Q26 40 35 31' },
  }
  const c = configs[n] ?? configs[0]
  return (
    <div style={{ width: 88, height: 88, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s', margin: '0 auto 28px' }}>
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ transition: 'all 0.25s' }}>
        <circle cx="26" cy="26" r="22" stroke={c.stroke} strokeWidth="2.5" />
        <circle cx="19" cy="22" r="2.5" fill={c.stroke} />
        <circle cx="33" cy="22" r="2.5" fill={c.stroke} />
        <path d={c.mouth} stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  )
}

function StarRow({ stars, hovered, onHover, onClick }: {
  stars: number | null; hovered: number | null
  onHover: (n: number | null) => void; onClick: (n: number) => void
}) {
  // Étoiles hors du conteneur centré pour prendre toute la largeur disponible
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 10, width: '100%' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = (hovered ?? stars ?? 0) >= n
        return (
          <button key={n}
            onMouseEnter={() => onHover(n)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0, transform: (hovered ?? 0) >= n ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.12s', touchAction: 'manipulation', flexShrink: 0 }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill={on ? '#FBBF24' : '#E2E8F0'} style={{ display: 'block', transition: 'fill 0.1s' }}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

function detectLang(): string {
  if (typeof navigator === 'undefined') return 'en'
  const l = navigator.language?.slice(0, 2).toLowerCase()
  return T[l] ? l : 'en'
}

export default function ReviewPage() {
  const params = useParams()
  const slug   = params.slug  as string
  const token  = params.token as string

  const [lang, setLang]     = useState('en')
  const [info, setInfo]     = useState<{ shopName: string; shopCity: string | null; customerName: string; googlePlaceId: string | null; alreadyReviewed: boolean } | null>(null)
  const [pageError, setPageError] = useState('')

  const [stars,      setStars]      = useState<number | null>(null)
  const [hovered,    setHovered]    = useState<number | null>(null)
  const [phase,      setPhase]      = useState<'rate' | 'good' | 'bad' | 'done'>('rate')
  const [googleUrl,  setGoogleUrl]  = useState<string | null>(null)
  const [badComment, setBadComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [charCount,  setCharCount]  = useState(0)
  const [countdown,  setCountdown]  = useState(3) // kept for compat but no longer used

  useEffect(() => { setLang(detectLang()) }, [])

  useEffect(() => {
    fetch(`/api/public/${slug}/review/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setPageError(d.error); else setInfo(d) })
      .catch(() => setPageError('network'))
  }, [slug, token])

  const t = T[lang] ?? T['en']

  const handleStarClick = useCallback(async (n: number) => {
    setStars(n)
    setSubmitting(true)
    const res  = await fetch(`/api/public/${slug}/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: n, comment: '' }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (n >= 4) {
      const url = data.googleReviewUrl ?? null
      setGoogleUrl(url)
      setPhase('good')
    } else {
      setPhase('bad')
    }
  }, [slug, token])

  const handleBadSubmit = useCallback(async () => {
    if (!badComment.trim()) return
    setSubmitting(true)
    await fetch(`/api/public/${slug}/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: stars, comment: badComment }),
    }).catch(() => {})
    setSubmitting(false)
    setPhase('done')
  }, [slug, token, stars, badComment])

  // Design tokens — cohérent avec le SaaS
  const PURPLE      = '#0D9488'
  const PURPLE_DARK = '#0F766E'
  const PURPLE_LIGHT = '#F0FDFA'
  const FF = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  const page: React.CSSProperties = { minHeight: '100svh', background: '#f8faff', fontFamily: FF, display: 'flex', flexDirection: 'column' }
  const hdr: React.CSSProperties = { background: `linear-gradient(135deg, ${PURPLE}, #0891B2)`, padding: '20px 24px 32px', textAlign: 'center' }
  const card: React.CSSProperties = { background: '#fff', borderRadius: 20, margin: '-18px 16px 0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', padding: '24px 20px' }
  const footer: React.CSSProperties = { textAlign: 'center', padding: '14px', fontSize: 10, color: '#99F6E4', letterSpacing: '0.08em', textTransform: 'uppercase' as const }

  const GoogleSVG = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )

  // Header commun
  const Header = ({ gradient = `linear-gradient(135deg, ${PURPLE}, #0891B2)`, icon, sub }: { gradient?: string; icon: React.ReactNode; sub?: string }) => (
    <div style={{ ...hdr, background: gradient }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
        {icon}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{info?.shopName ?? ''}</p>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{sub}</p>}
    </div>
  )

  if (pageError) return (
    <div style={page}>
      <Header gradient="linear-gradient(135deg,#64748b,#475569)" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
      <div style={card}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{t.error}</p>
      </div>
    </div>
  )

  if (!info) return (
    <div style={{ ...page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: `2px solid ${PURPLE_LIGHT}`, borderTopColor: PURPLE, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (info.alreadyReviewed) return (
    <div style={page}>
      <Header icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>} sub={info.shopCity?.split(',')[0]} />
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>{t.alreadyDone}</p>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>{t.alreadyDoneHint}</p>
      </div>
      <div style={footer}>{t.poweredBy}</div>
    </div>
  )

  return (
    <div style={page}>

      {/* PHASE: rate */}
      {phase === 'rate' && (<>
        <Header
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
          sub={info.shopCity?.split(',')[0]}
        />
        <div style={{ ...card, textAlign: 'center' }}>
          {/* Partie centrée : visage + titre */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <FaceSVG stars={stars} hovered={hovered} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: 6 }}>{t.title}</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 22 }}>{t.subtitle}</p>
          </div>
          {/* Étoiles hors du flex colonne centré → prend toute la largeur */}
          <StarRow stars={stars} hovered={hovered} onHover={setHovered} onClick={n => !submitting && handleStarClick(n)} />
          <p style={{ fontSize: 10, color: '#cbd5e1', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', marginTop: 2 }}>{t.tapStar}</p>
        </div>
        <div style={footer}>{t.poweredBy}</div>
      </>)}

      {/* PHASE: good */}
      {phase === 'good' && (<>
        <Header
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
          sub={info?.shopCity?.split(',')[0]}
        />
        <div style={{ ...card, textAlign: 'center' }}>
          {/* Étoiles choisies */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
            {[1,2,3,4,5].map(n => (
              <svg key={n} width="28" height="28" viewBox="0 0 24 24" fill={(stars ?? 5) >= n ? '#FBBF24' : '#E2E8F0'} style={{ display: 'block' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 8 }}>
            {t.thanksGood.replace('{name}', info?.customerName ?? '')}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>{t.subtitleGood}</p>

          {googleUrl ? (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px 20px', background: `linear-gradient(135deg, ${PURPLE}, #0891B2)`, borderRadius: 16, fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', boxSizing: 'border-box', boxShadow: `0 4px 16px rgba(13,148,136,0.35)`, letterSpacing: '-0.01em' }}>
              <GoogleSVG />{t.openGoogle}
            </a>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b' }}>{t.noPlaceId}</p>
          )}
        </div>
        <div style={footer}>{t.poweredBy}</div>
      </>)}

      {/* PHASE: bad */}
      {phase === 'bad' && (<>
        <Header
          gradient="linear-gradient(135deg,#64748b,#475569)"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><circle cx="9" cy="10" r="1" fill="white" stroke="none"/><circle cx="15" cy="10" r="1" fill="white" stroke="none"/></svg>}
          sub={t.subtitleBad}
        />
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>{t.thanksBad}</h2>
          <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 16px', marginBottom: 16 }}>
            <textarea
              value={badComment}
              onChange={e => { setBadComment(e.target.value); setCharCount(e.target.value.length) }}
              placeholder={t.feedbackPlaceholder}
              maxLength={500}
              rows={5}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'none', fontSize: 13, color: '#334155', lineHeight: 1.7, resize: 'none', fontFamily: 'inherit' }}
            />
            <p style={{ textAlign: 'right', fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{charCount} / 500</p>
          </div>
          <button
            onClick={handleBadSubmit}
            disabled={!badComment.trim() || submitting}
            style={{ width: '100%', padding: '14px', background: badComment.trim() ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` : '#e2e8f0', color: badComment.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: badComment.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s', touchAction: 'manipulation' }}>
            {submitting ? '…' : t.sendFeedback}
          </button>
        </div>
        <div style={footer}>{t.poweredBy}</div>
      </>)}

      {/* PHASE: done */}
      {phase === 'done' && (<>
        <Header
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        />
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>{t.sent}</p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>{t.sentSub}</p>
        </div>
        <div style={footer}>{t.poweredBy}</div>
      </>)}
    </div>
  )
}
