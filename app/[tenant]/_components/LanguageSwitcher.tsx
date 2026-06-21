'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const current = LANGS.find(l => l.code === locale) ?? LANGS[0]

  async function switchLang(code: string) {
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: code }),
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium group transition-colors"
        style={{ color: '#475569' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
        onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
      >
        <Globe size={14} style={{ color: '#334155', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{current.flag} {current.label}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          marginBottom: 4,
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLang(lang.code)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                border: 'none',
                background: lang.code === locale ? 'rgba(13,148,136,0.15)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: lang.code === locale ? '#5EEAD4' : '#94a3b8',
                fontSize: 13,
                fontWeight: lang.code === locale ? 600 : 400,
              }}
              onMouseEnter={e => { if (lang.code !== locale) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (lang.code !== locale) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === locale && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#0D9488' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
