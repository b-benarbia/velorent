'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Sparkles, X, Send, ChevronDown, RotateCcw, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  fromVoice?: boolean
}

type ChipPriority = 'urgent' | 'warning' | 'info'
interface ChipItem { label: string; priority: ChipPriority }

const DOT_COLOR: Record<ChipPriority, string> = {
  urgent: '#ef4444',
  warning: '#f59e0b',
  info: '#6366F1',
}

// Map app locale → SpeechRecognition language code
const SPEECH_LANG: Record<string, string> = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES',
  de: 'de-DE', it: 'it-IT', nl: 'nl-NL', pt: 'pt-PT',
}

export default function AIAssistant() {
  const locale = useLocale()
  const t = useTranslations('copilot')
  const speechLang = SPEECH_LANG[locale] ?? 'fr-FR'

  // Chat state
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chips, setChips] = useState<ChipItem[]>([])

  // Voice state
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [lastWasVoice, setLastWasVoice] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Check browser support
  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input + fetch chips on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 250)
      fetch(`/api/ai/chips?locale=${locale}`)
        .then(r => r.json())
        .then(d => { if (d.chips) setChips(d.chips) })
        .catch(() => {})
    }
  }, [open, locale])

  // Stop audio when panel closes
  useEffect(() => {
    if (!open) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      recognitionRef.current?.abort()
      setListening(false)
      setSpeaking(false)
    }
  }, [open])

  /* ── Text-to-speech (OpenAI TTS — voix naturelle) ── */
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakText = useCallback(async (text: string) => {
    // Stop any ongoing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(true)
    try {
      const res = await fetch('/api/ai/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }, [locale])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  /* ── AI ask ── */
  const ask = useCallback(async (question: string, fromVoice = false) => {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    setLastWasVoice(fromVoice)

    setMessages(prev => [
      ...prev,
      { role: 'user', content: q, fromVoice },
      { role: 'assistant', content: '', loading: true },
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, locale }),
      })
      const data = await res.json()
      const answer = data.answer ?? t('error')

      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: answer, loading: false } : m
        )
      )

      // Auto-read aloud when asked by voice
      if (fromVoice) speakText(answer)
    } catch {
      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: t('error'), loading: false } : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [loading, locale, t, speakText])

  /* ── Speech recognition ── */
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    window.speechSynthesis?.cancel()

    const r = new SR()
    r.lang = speechLang
    r.continuous = false
    r.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interim = Array.from(e.results).map((res: any) => res[0].transcript).join('')
      setInput(interim)
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false)
        ask(interim, true)
        setInput('')
      }
    }
    r.onerror = () => { setListening(false) }
    r.onend = () => { setListening(false) }

    recognitionRef.current = r
    r.start()
    setListening(true)
    setInput('')
  }, [speechLang, ask])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const defaultChips: ChipItem[] = [
    { label: t('chip1'), priority: 'info' },
    { label: t('chip2'), priority: 'info' },
    { label: t('chip3'), priority: 'info' },
    { label: t('chip4'), priority: 'info' },
  ]
  const activeChips: ChipItem[] = chips.length > 0 ? chips : defaultChips

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        aria-hidden={!open}
        style={{
          position: 'fixed',
          zIndex: 45,
          right: 16,
          bottom: 'calc(68px + max(16px, env(safe-area-inset-bottom, 0px)))',
          width: 'min(380px, calc(100vw - 32px))',
          height: open ? 'min(540px, calc(100dvh - 140px))' : 0,
          borderRadius: 20,
          background: '#fff',
          boxShadow: open
            ? '0 24px 64px rgba(15,23,42,0.18), 0 0 0 1px rgba(99,102,241,0.12)'
            : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'height 0.3s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '14px 16px',
          background: 'linear-gradient(135deg,#6366F1 0%,#8b5cf6 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={15} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>VeloRent Copilot</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{t('panelSubtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Stop speaking */}
            {speaking && (
              <button onClick={stopSpeaking} title={t('stopSpeaking')} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VolumeX size={13} color="white" />
              </button>
            )}
            {/* Reset */}
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); stopSpeaking() }} title={t('newQuestion')} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={12} color="white" />
              </button>
            )}
            {/* Close */}
            <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronDown size={14} color="white" />
            </button>
          </div>
        </div>

        {/* Listening banner */}
        {listening && (
          <div style={{ flexShrink: 0, background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 3, borderRadius: 2, background: '#ef4444', animation: `voiceBar 0.8s ease ${i * 0.1}s infinite alternate` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{t('listening')}</span>
            <button onClick={stopListening} style={{ marginLeft: 'auto', fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('stopListening')}</button>
          </div>
        )}

        {/* Speaking banner */}
        {speaking && !listening && (
          <div style={{ flexShrink: 0, background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={13} color="#16a34a" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{t('speakingNow')}</span>
            <button onClick={stopSpeaking} style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('stopSpeaking')}</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Sparkles size={12} color="#6366F1" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', letterSpacing: '0.04em' }}>COPILOT</span>
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{t('welcome')}</p>
                {voiceSupported && (
                  <p style={{ fontSize: 12, color: '#6366F1', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Mic size={11} /> {t('tapToSpeak')}
                  </p>
                )}
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 2px 0' }}>{t('suggestions')}</p>
              {activeChips.map((chip, i) => (
                <button key={i} onClick={() => ask(chip.label, false)}
                  style={{ textAlign: 'left', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '9px 13px', fontSize: 13, color: '#374151', cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 9 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f8faff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white' }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLOR[chip.priority], flexShrink: 0 }} />
                  {chip.label}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#6366F1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Sparkles size={12} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '80%', padding: '10px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  background: m.role === 'user' ? '#6366F1' : '#f8faff',
                  border: m.role === 'user' ? 'none' : '1px solid #e0e7ff',
                  fontSize: 13, color: m.role === 'user' ? 'white' : '#374151', lineHeight: 1.55, wordBreak: 'break-word',
                }}>
                  {m.loading ? (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '3px 0' }}>
                      {[0, 1, 2].map(j => (
                        <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a5b4fc', animation: `aiDot 1.2s ease ${j * 0.2}s infinite` }} />
                      ))}
                    </div>
                  ) : (
                    <div>
                      {m.content}
                      {/* Re-read button for assistant messages */}
                      {m.role === 'assistant' && !m.loading && voiceSupported && (
                        <button
                          onClick={() => speakText(m.content)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#a5b4fc', fontSize: 11 }}
                        >
                          <Volume2 size={11} /> {t('reread')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Mic indicator on user voice messages */}
                {m.role === 'user' && m.fromVoice && (
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                    <Mic size={10} color="#ef4444" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Mic button */}
          {voiceSupported && (
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              title={listening ? t('stopListening') : t('tapToSpeak')}
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: listening
                  ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                  : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: listening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none',
                animation: listening ? 'micPulse 1s ease infinite' : 'none',
              }}
            >
              {listening
                ? <MicOff size={15} color="white" />
                : <Mic size={15} color="#64748b" />
              }
            </button>
          )}

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input, false) } }}
            placeholder={listening ? t('listening') : t('inputPlaceholder')}
            disabled={loading || listening}
            style={{
              flex: 1, border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '10px 14px', fontSize: 13, outline: 'none',
              background: (loading || listening) ? '#f8fafc' : 'white',
              color: listening ? '#94a3b8' : '#0f172a',
              transition: 'border-color 0.15s',
              fontStyle: listening ? 'italic' : 'normal',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#a5b4fc')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
          />

          <button
            onClick={() => ask(input, false)}
            disabled={!input.trim() || loading || listening}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
              cursor: input.trim() && !loading && !listening ? 'pointer' : 'not-allowed',
              background: input.trim() && !loading && !listening
                ? 'linear-gradient(135deg,#6366F1,#8b5cf6)'
                : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
          >
            <Send size={15} color={input.trim() && !loading && !listening ? 'white' : '#94a3b8'} />
          </button>
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="VeloRent Copilot"
        style={{
          position: 'fixed',
          bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          right: 16,
          zIndex: 46,
          width: 52, height: 52, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: open ? 'white' : 'linear-gradient(135deg,#6366F1 0%,#8b5cf6 100%)',
          boxShadow: open ? '0 2px 12px rgba(15,23,42,0.12)' : '0 4px 20px rgba(99,102,241,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.34,1.4,0.64,1)',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
      >
        {open ? <X size={20} color="#6366F1" /> : <Sparkles size={20} color="white" />}
        {!open && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.35)',
            animation: 'aiFabPulse 2.5s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </button>

      <style>{`
        @keyframes aiDot {
          0%,100% { transform:translateY(0); opacity:0.35; }
          50% { transform:translateY(-4px); opacity:1; }
        }
        @keyframes aiFabPulse {
          0% { transform:scale(1); opacity:0.6; }
          100% { transform:scale(1.7); opacity:0; }
        }
        @keyframes micPulse {
          0%,100% { box-shadow:0 0 0 4px rgba(239,68,68,0.2); }
          50% { box-shadow:0 0 0 8px rgba(239,68,68,0.1); }
        }
        @keyframes voiceBar {
          from { height:4px; }
          to { height:18px; }
        }
      `}</style>
    </>
  )
}
