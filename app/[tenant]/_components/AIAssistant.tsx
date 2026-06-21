'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, Mic, MicOff, Volume2, Sparkles, Send, RotateCcw } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  fromVoice?: boolean
}

type ChipPriority = 'urgent' | 'warning' | 'info'
interface ChipItem { label: string; priority: ChipPriority }

const SPEECH_LANG: Record<string, string> = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES',
  de: 'de-DE', it: 'it-IT', nl: 'nl-NL', pt: 'pt-PT',
}

type OrbMode = 'idle' | 'listening' | 'thinking' | 'speaking'

/* ──────────────────────────────────────────────────────────────
   PremiumResponse — 3 display modes:
   1. STAT    — short response with a clear metric → big number
   2. EMPTY   — "Zéro / Aucun / Pas de" → italic, dimmed
   3. TEXT    — complex sentence → highlighted numbers inline
   ────────────────────────────────────────────────────────────── */
const STAT_UNIT_RX = /vélos?|locations?|réservations?|€|euros?|%|retards?|clients?|factures?/i

function PremiumResponse({ text }: { text: string }) {
  const clean = text.trim()

  // Mode EMPTY
  const isEmpty = /^(zéro|aucun|pas de|rien|0 )/i.test(clean)
  if (isEmpty) {
    return (
      <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, fontStyle: 'italic' }}>
        {clean}
      </p>
    )
  }

  // Mode STAT — short answer with a clear number + recognisable unit
  const statM = clean.length <= 95 && clean.match(
    new RegExp(`(\\d[\\d.,]*)\\s*(${STAT_UNIT_RX.source})`, 'i')
  )
  if (statM) {
    const num  = statM[1]
    const unit = statM[2]
    const ctx  = clean
      .replace(statM[0], '')
      .replace(/\btu as\b/gi, '')
      .replace(/^[,.\s]+/, '')
      .replace(/[,.\s]+$/, '')
      .trim()
    return (
      <div>
        {/* Big metric */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{
            fontSize: 48, fontWeight: 800, color: '#5EEAD4',
            lineHeight: 1, letterSpacing: '-0.025em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {num}
          </span>
          <span style={{ fontSize: 16, color: 'rgba(94,234,212,0.6)', fontWeight: 600 }}>
            {unit}
          </span>
        </div>
        {/* Context below */}
        {ctx && (
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5, fontWeight: 400 }}>
            {ctx}
          </p>
        )}
      </div>
    )
  }

  // Mode TEXT — complex, highlight numbers
  const parts = clean.split(/(\d[\d.,]*\s*(?:€|euros?|%|h\b|min\b|km\b|vélos?|locations?)?)/g)
  return (
    <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7, fontWeight: 400 }}>
      {parts.map((p, i) =>
        /^\d/.test(p)
          ? <strong key={i} style={{ color: '#5EEAD4', fontWeight: 700 }}>{p}</strong>
          : p
      )}
    </p>
  )
}

export default function AIAssistant() {
  const locale     = useLocale()
  const t          = useTranslations('copilot')
  const speechLang = SPEECH_LANG[locale] ?? 'fr-FR'

  const [open, setOpen]             = useState(false)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [chips, setChips]           = useState<ChipItem[]>([])
  const [listening, setListening]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)

  const inputRef       = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)

  const orbMode: OrbMode  = listening ? 'listening' : loading ? 'thinking' : speaking ? 'speaking' : 'idle'
  const lastUser          = [...messages].reverse().find(m => m.role === 'user')
  const lastAssistant     = [...messages].reverse().find(m => m.role === 'assistant')
  const hasResponse       = !!(lastAssistant && !lastAssistant.loading)

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }, [])

  useEffect(() => {
    if (open) {
      fetch(`/api/ai/chips?locale=${locale}`)
        .then(r => r.json())
        .then(d => { if (d.chips) setChips(d.chips) })
        .catch(() => {})
    }
  }, [open, locale])

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause(); audioRef.current = null
      recognitionRef.current?.abort()
      setListening(false); setSpeaking(false)
      /* Auto-reset: fresh state every time the widget is closed */
      setMessages([]); setInput('')
    }
  }, [open])

  /* ── TTS ── */
  const speakText = useCallback(async (text: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setSpeaking(true)
    try {
      const res = await fetch('/api/ai/speak', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale }),
      })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      await audio.play()
    } catch { setSpeaking(false) }
  }, [locale])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause(); audioRef.current = null; setSpeaking(false)
  }, [])

  /* ── Ask AI ── */
  const ask = useCallback(async (question: string, fromVoice = false) => {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev,
      { role: 'user', content: q, fromVoice },
      { role: 'assistant', content: '', loading: true },
    ])
    setLoading(true)
    try {
      const res    = await fetch('/api/ai/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, locale }) })
      const data   = await res.json()
      const answer = data.answer ?? t('error')
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: answer, loading: false } : m))
      if (fromVoice) speakText(answer)
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: t('error'), loading: false } : m))
    } finally { setLoading(false) }
  }, [loading, locale, t, speakText])

  /* ── Speech recognition ── */
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    window.speechSynthesis?.cancel(); stopSpeaking()
    const r = new SR()
    r.lang = speechLang; r.continuous = false; r.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interim = Array.from(e.results).map((res: any) => res[0].transcript).join('')
      setInput(interim)
      if (e.results[e.results.length - 1].isFinal) { setListening(false); ask(interim, true); setInput('') }
    }
    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)
    recognitionRef.current = r; r.start(); setListening(true); setInput('')
  }, [speechLang, ask, stopSpeaking])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop(); setListening(false)
  }, [])

  const defaultChips: ChipItem[] = [
    { label: t('chip1'), priority: 'info' }, { label: t('chip2'), priority: 'info' },
    { label: t('chip3'), priority: 'info' }, { label: t('chip4'), priority: 'info' },
  ]
  const activeChips = chips.length > 0 ? chips : defaultChips

  /* ── Orb visual config by mode ── */
  const ringOpacity  = { idle: [0.06,0.11,0.18], listening: [0.14,0.26,0.40], thinking: [0.08,0.14,0.22], speaking: [0.11,0.20,0.32] }[orbMode]
  const ringDur      = { idle: '3.6s', listening: '0.95s', thinking: '1.7s', speaking: '0.9s' }[orbMode]
  const coreGlow     = { idle: 'rgba(13,148,136,0.4)', listening: 'rgba(13,148,136,0.85)', thinking: 'rgba(8,145,178,0.6)', speaking: 'rgba(52,211,153,0.65)' }[orbMode]
  const coreBlur     = { idle: 16, listening: 36, thinking: 20, speaking: 28 }[orbMode]

  return (
    <>
      {open && (
        <>
          {/* ── Veil: radial warmth at center, barely visible ── */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 48,
              background: 'radial-gradient(ellipse 55% 55% at 50% 44%, rgba(13,148,136,0.04) 0%, rgba(248,250,252,0.18) 100%)',
              backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
            }}
            onClick={() => setOpen(false)}
          />

          {/* ── Floating widget ── */}
          <div
            className="ai-float"
            style={{
              position: 'fixed', zIndex: 49,
              left: '50%', top: '50%',
              transform: 'translate(-50%, -52%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              maxHeight: 'calc(100svh - 80px)', overflowY: 'auto',
              /* paddingTop leaves room for the orb outer ring transform overflow */
              padding: '22px 0 16px',
              animation: 'floatIn 0.34s cubic-bezier(0.34,1.2,0.64,1)',
            }}
            onClick={e => e.stopPropagation()}
          >

            {/* Ghost previous question */}
            {lastUser && (
              <p style={{ margin: '0 0 12px', fontSize: 11, color: 'rgba(71,85,105,0.45)', fontStyle: 'italic', textAlign: 'center', maxWidth: 300, lineHeight: 1.4, animation: 'fadeUp 0.28s ease' }}>
                &ldquo;{lastUser.content}&rdquo;
              </p>
            )}

            {/* ══════════════ ORB ══════════════
                Scales DOWN (0.82×) once response is showing
                so the card becomes the visual hero        */}
            <div
              style={{
                position: 'relative', width: 176, height: 176, flexShrink: 0,
                cursor: voiceSupported && !loading ? 'pointer' : 'default',
                transform: `scale(${hasResponse || lastAssistant?.loading ? 0.82 : 1})`,
                transition: 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)',
                marginBottom: hasResponse || lastAssistant?.loading ? -10 : 0,
              }}
              onClick={voiceSupported && !loading ? (listening ? stopListening : startListening) : undefined}
              title={listening ? 'Arrêter' : 'Parler'}
            >
              {/* Outer pulse ring — inset:0 so CSS transform expansion is NOT clipped by overflow-y */}
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1.5px solid rgba(13,148,136,${orbMode==='listening'?0.5:0.17})`, animation:`orbPulseOut ${orbMode==='listening'?'1s':'3s'} ease-out infinite`, pointerEvents:'none' }} />

              {/* Rings */}
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:`rgba(13,148,136,${ringOpacity[0]})`, animation:`orbBreath ${ringDur} ease-in-out 0s infinite`, transition:'background 0.5s' }} />
              <div style={{ position:'absolute', inset:22, borderRadius:'50%', background:`rgba(13,148,136,${ringOpacity[1]})`, animation:`orbBreath ${ringDur} ease-in-out 0.15s infinite`, transition:'background 0.5s' }} />
              <div style={{ position:'absolute', inset:44, borderRadius:'50%', background:`rgba(13,148,136,${ringOpacity[2]})`, animation:`orbBreath ${ringDur} ease-in-out 0.30s infinite`, transition:'background 0.5s' }} />

              {/* Thinking conic spinner */}
              {orbMode === 'thinking' && (
                <div style={{ position:'absolute', inset:58, borderRadius:'50%', background:'conic-gradient(transparent 0deg, rgba(13,148,136,0.5) 200deg, transparent 360deg)', animation:'orbSpin 1.25s linear infinite', pointerEvents:'none' }} />
              )}

              {/* Sonar rings (listening) */}
              {orbMode === 'listening' && [0,1,2].map(i => (
                <div key={i} style={{ position:'absolute', inset:58, borderRadius:'50%', border:'2px solid rgba(13,148,136,0.5)', animation:`sonarRing 1.9s ease-out ${i*0.57}s infinite`, pointerEvents:'none' }} />
              ))}

              {/* Core */}
              <div style={{
                position:'absolute', inset:58, borderRadius:'50%',
                background:'linear-gradient(135deg,#0D9488 0%,#0891B2 100%)',
                boxShadow:`0 0 ${coreBlur}px ${coreGlow}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'box-shadow 0.4s ease',
                animation: orbMode !== 'thinking' ? 'orbCorePulse 2.8s ease-in-out infinite' : 'none',
              }}>
                {orbMode==='listening' ? <MicOff size={24} color="white" />
                 : orbMode==='thinking' ? <Sparkles size={21} color="white" />
                 : orbMode==='speaking' ? <Volume2 size={21} color="white" />
                 : <Mic size={24} color="white" />}
              </div>
            </div>

            {/* ── Status line ── */}
            <div style={{ height:24, display:'flex', alignItems:'center', justifyContent:'center', marginTop:14 }}>
              {orbMode === 'idle' && !hasResponse && (
                <p style={{ margin:0, fontSize:12, color:'rgba(71,85,105,0.55)', fontWeight:500 }}>
                  {voiceSupported ? 'Touchez pour parler' : 'Tapez votre question'}
                </p>
              )}
              {orbMode === 'listening' && (
                <p style={{ margin:0, fontSize:12, color:'#0D9488', fontWeight:600, animation:'textBlink 1.1s ease infinite' }}>
                  {input || 'En écoute…'}
                </p>
              )}
              {orbMode === 'thinking' && (
                <p style={{ margin:0, fontSize:12, color:'rgba(71,85,105,0.5)', fontWeight:500, animation:'textBlink 1.5s ease infinite' }}>
                  Réflexion…
                </p>
              )}
              {orbMode === 'speaking' && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:18 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ width:2.5, background:'#0D9488', borderRadius:2, animation:`voiceBar 0.65s ease ${i*0.09}s infinite alternate` }} />
                    ))}
                  </div>
                  <button onClick={stopSpeaking} style={{ background:'rgba(13,148,136,0.1)', border:'1px solid rgba(13,148,136,0.22)', borderRadius:8, padding:'2px 9px', color:'#0D9488', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    Stop
                  </button>
                </div>
              )}
            </div>

            {/* ══════════════ RESPONSE CARD ══════════════ */}
            {lastAssistant && !lastAssistant.loading && (
              <div style={{
                marginTop:12,
                width:'min(400px,calc(100vw - 48px))',
                background:'rgba(9,13,24,0.88)',
                backdropFilter:'blur(48px) saturate(180%)',
                WebkitBackdropFilter:'blur(48px) saturate(180%)',
                border:'1px solid rgba(255,255,255,0.07)',
                borderLeft:'2.5px solid rgba(13,148,136,0.7)',
                borderRadius:22, padding:'18px 22px',
                animation:'cardIn 0.40s cubic-bezier(0.34,1.2,0.64,1)',
                boxShadow:'0 24px 60px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.04)',
              }}>
                {/* Label row */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#0D9488', animation:'statusPulse 2s ease infinite' }} />
                    <span style={{ fontSize:9, fontWeight:700, color:'rgba(94,234,212,0.55)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Copilot</span>
                  </div>
                  {voiceSupported && (
                    <button onClick={() => speakText(lastAssistant.content)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', padding:0, color:'rgba(94,234,212,0.35)', fontSize:11, transition:'color 0.14s' }}
                      onMouseEnter={e => (e.currentTarget.style.color='rgba(94,234,212,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color='rgba(94,234,212,0.35)')}>
                      <Volume2 size={11} /> Relire
                    </button>
                  )}
                </div>
                {/* Smart response */}
                <PremiumResponse text={lastAssistant.content} />
              </div>
            )}

            {/* Loading card */}
            {lastAssistant?.loading && (
              <div style={{
                marginTop:12, width:'min(400px,calc(100vw - 48px))',
                background:'rgba(9,13,24,0.80)', backdropFilter:'blur(44px)', WebkitBackdropFilter:'blur(44px)',
                border:'1px solid rgba(255,255,255,0.06)', borderLeft:'2.5px solid rgba(13,148,136,0.4)',
                borderRadius:20, padding:'16px 20px',
                boxShadow:'0 20px 56px rgba(0,0,0,0.20)',
              }}>
                <div style={{ display:'flex', gap:7 }}>
                  {[0,1,2].map(j => (
                    <div key={j} style={{ width:8, height:8, borderRadius:'50%', background:'#5EEAD4', animation:`aiDot 1.2s ease ${j*0.22}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════ CHIPS — compact horizontal pills ══════════════ */}
            {messages.length === 0 && (
              <div style={{ marginTop:14, width:'min(400px,calc(100vw - 48px))', display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
                {activeChips.slice(0, 4).map((chip, i) => (
                  <button key={i} onClick={() => ask(chip.label)}
                    style={{
                      background:'rgba(255,255,255,0.72)',
                      backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                      border:'1px solid rgba(13,148,136,0.13)',
                      borderRadius:100, padding:'7px 14px',
                      fontSize:12, color:'#1E293B', cursor:'pointer',
                      boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                      transition:'all 0.13s', whiteSpace:'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.borderColor='rgba(13,148,136,0.32)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.72)'; e.currentTarget.style.borderColor='rgba(13,148,136,0.13)' }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* ══════════════ INPUT ROW ══════════════ */}
            <div style={{ marginTop:12, width:'min(400px,calc(100vw - 48px))', display:'flex', gap:7, alignItems:'center' }}>
              {/* Input field — mic icon embedded left */}
              <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center' }}>
                {voiceSupported && (
                  <button
                    onClick={listening ? stopListening : startListening}
                    disabled={loading}
                    style={{
                      position:'absolute', left:10, zIndex:1,
                      width:26, height:26, borderRadius:8, border:'none',
                      background: listening ? 'rgba(239,68,68,0.12)' : 'transparent',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all 0.18s',
                      animation: listening ? 'micPulse 1s ease infinite' : 'none',
                    }}
                  >
                    {listening
                      ? <MicOff size={14} color="#ef4444" />
                      : <Mic size={14} color="#94A3B8" />
                    }
                  </button>
                )}
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask(input) } }}
                  placeholder={listening ? 'En écoute…' : 'Ou tapez…'}
                  disabled={loading || listening}
                  style={{
                    width:'100%', height:38,
                    background:'rgba(255,255,255,0.80)',
                    backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                    border:'1px solid rgba(13,148,136,0.13)',
                    borderRadius:12, padding: voiceSupported ? '0 12px 0 42px' : '0 12px',
                    fontSize:13, color:'#0f172a', outline:'none',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                    transition:'border-color 0.14s',
                    fontStyle: listening ? 'italic' : 'normal',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.42)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.13)')}
                />
              </div>
              {/* Send */}
              <button
                onClick={() => ask(input)}
                disabled={!input.trim() || loading || listening}
                style={{
                  width:38, height:38, borderRadius:12, border:'none', flexShrink:0,
                  cursor: input.trim() && !loading && !listening ? 'pointer' : 'not-allowed',
                  background: input.trim() && !loading && !listening
                    ? 'linear-gradient(135deg,#0D9488,#0891B2)'
                    : 'rgba(255,255,255,0.65)',
                  backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.14s',
                }}
              >
                <Send size={14} color={input.trim() && !loading && !listening ? 'white' : '#94A3B8'} />
              </button>
            </div>

            {/* Reset — pill button, clearly readable */}
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setInput(''); stopSpeaking() }}
                style={{
                  marginTop:10,
                  background:'rgba(255,255,255,0.78)',
                  backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                  border:'1px solid rgba(13,148,136,0.22)',
                  borderRadius:100, padding:'7px 16px',
                  cursor:'pointer',
                  color:'#334155', fontSize:12, fontWeight:500,
                  display:'flex', alignItems:'center', gap:5,
                  boxShadow:'0 2px 8px rgba(0,0,0,0.07)',
                  transition:'all 0.14s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.96)'; e.currentTarget.style.borderColor='rgba(13,148,136,0.42)' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.78)'; e.currentTarget.style.borderColor='rgba(13,148,136,0.22)' }}
              >
                <RotateCcw size={11} color="#0D9488" /> Nouvelle question
              </button>
            )}
          </div>
        </>
      )}

      {/* ══════════════ FAB ══════════════ */}
      <button
        className="ai-fab-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="VeloRent Copilot"
        style={{
          position:'fixed',
          bottom:'max(24px, env(safe-area-inset-bottom, 24px))',
          right:16, zIndex:50,
          width:56, height:56, borderRadius:'50%',
          border:'none', cursor:'pointer',
          background: open ? 'white' : 'linear-gradient(135deg,#0D9488 0%,#0891B2 100%)',
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.13), 0 0 0 1px rgba(13,148,136,0.12)'
            : '0 4px 24px rgba(13,148,136,0.52)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.28s cubic-bezier(0.34,1.4,0.64,1)',
          transform: open ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        {open ? <X size={20} color="#0D9488" /> : <Sparkles size={20} color="white" />}
        {!open && (
          <span style={{ position:'absolute', inset:-7, borderRadius:'50%', border:'2px solid rgba(13,148,136,0.32)', animation:'aiFabPulse 2.6s ease-out infinite', pointerEvents:'none' }} />
        )}
      </button>

      {/* ══════════════ KEYFRAMES ══════════════ */}
      <style>{`
        .ai-float { scrollbar-width:none; -ms-overflow-style:none; }
        .ai-float::-webkit-scrollbar { display:none; }

        /* Mobile: FAB goes bottom-LEFT above the nav bar so it doesn't
           overlap the bottom nav (~56px) or the New Rental FAB (bottom-right) */
        @media (max-width: 767px) {
          .ai-fab-btn {
            left: 16px !important;
            right: auto !important;
            bottom: calc(62px + max(8px, env(safe-area-inset-bottom, 0px))) !important;
          }
        }

        @keyframes orbBreath {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.08); }
        }
        @keyframes orbCorePulse {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.05); }
        }
        @keyframes orbPulseOut {
          0%   { transform:scale(1);    opacity:0.6; }
          100% { transform:scale(1.58); opacity:0;   }
        }
        @keyframes orbSpin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes sonarRing {
          0%   { transform:scale(1);   opacity:0.75; }
          100% { transform:scale(4.5); opacity:0; }
        }
        @keyframes aiDot {
          0%,100% { transform:translateY(0);   opacity:0.35; }
          50%      { transform:translateY(-5px); opacity:1; }
        }
        @keyframes aiFabPulse {
          0%   { transform:scale(1);    opacity:0.65; }
          100% { transform:scale(1.85); opacity:0; }
        }
        @keyframes cardIn {
          from { opacity:0; transform:translateY(8px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
        @keyframes floatIn {
          from { opacity:0; transform:translate(-50%,-50%) scale(0.95); }
          to   { opacity:1; transform:translate(-50%,-52%) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes statusPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.4; }
        }
        @keyframes textBlink {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        @keyframes voiceBar {
          from { height:3px; }
          to   { height:18px; }
        }
        @keyframes micPulse {
          0%,100% { box-shadow:0 0 0 2px rgba(239,68,68,0.22); }
          50%      { box-shadow:0 0 0 6px rgba(239,68,68,0.08); }
        }
      `}</style>
    </>
  )
}
