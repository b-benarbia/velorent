'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

const COUNTRY_CODES = [
  { code: 'FR', flag: '🇫🇷' },
  { code: 'ES', flag: '🇪🇸' },
  { code: 'DE', flag: '🇩🇪' },
  { code: 'GB', flag: '🇬🇧' },
  { code: 'IT', flag: '🇮🇹' },
  { code: 'PT', flag: '🇵🇹' },
  { code: 'NL', flag: '🇳🇱' },
  { code: 'BE', flag: '🇧🇪' },
  { code: 'CH', flag: '🇨🇭' },
  { code: 'AT', flag: '🇦🇹' },
  { code: 'PL', flag: '🇵🇱' },
  { code: 'SE', flag: '🇸🇪' },
  { code: 'NO', flag: '🇳🇴' },
  { code: 'DK', flag: '🇩🇰' },
  { code: 'FI', flag: '🇫🇮' },
  { code: 'IE', flag: '🇮🇪' },
  { code: 'CZ', flag: '🇨🇿' },
  { code: 'RO', flag: '🇷🇴' },
  { code: 'HU', flag: '🇭🇺' },
  { code: 'GR', flag: '🇬🇷' },
  { code: 'HR', flag: '🇭🇷' },
  { code: 'US', flag: '🇺🇸' },
  { code: 'CA', flag: '🇨🇦' },
  { code: 'AU', flag: '🇦🇺' },
  { code: 'NZ', flag: '🇳🇿' },
  { code: 'JP', flag: '🇯🇵' },
  { code: 'KR', flag: '🇰🇷' },
  { code: 'CN', flag: '🇨🇳' },
  { code: 'IN', flag: '🇮🇳' },
  { code: 'BR', flag: '🇧🇷' },
  { code: 'MX', flag: '🇲🇽' },
  { code: 'AR', flag: '🇦🇷' },
  { code: 'CO', flag: '🇨🇴' },
  { code: 'CL', flag: '🇨🇱' },
  { code: 'MA', flag: '🇲🇦' },
  { code: 'DZ', flag: '🇩🇿' },
  { code: 'TN', flag: '🇹🇳' },
  { code: 'SN', flag: '🇸🇳' },
  { code: 'CI', flag: '🇨🇮' },
  { code: 'NG', flag: '🇳🇬' },
  { code: 'ZA', flag: '🇿🇦' },
  { code: 'EG', flag: '🇪🇬' },
  { code: 'SA', flag: '🇸🇦' },
  { code: 'AE', flag: '🇦🇪' },
  { code: 'IL', flag: '🇮🇱' },
  { code: 'TR', flag: '🇹🇷' },
  { code: 'RU', flag: '🇷🇺' },
  { code: 'UA', flag: '🇺🇦' },
]

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function CountrySelect({ value, onChange, className }: Props) {
  const locale = useLocale()
  const tCommon = useTranslations('common')

  // Build locale-aware country name list
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
  const COUNTRIES = [
    ...COUNTRY_CODES.map(c => ({ ...c, name: displayNames.of(c.code) ?? c.code })),
    { code: 'OTHER', flag: '🌍', name: tCommon('other') },
  ]

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = COUNTRIES.find(c => c.code === value)

  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'Enter' && filtered.length === 1) {
      onChange(filtered[0].code)
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 10,
          border: open ? '1.5px solid #0D9488' : '1.5px solid #e2e8f0',
          background: 'white',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(13,148,136,0.1)' : 'none',
        }}
      >
        {selected ? (
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{selected.flag}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selected.name}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{selected.code}</span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>{tCommon('search')}...</span>
        )}
        <ChevronDown
          size={14}
          color="#94a3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'white',
          border: '1.5px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
          overflow: 'hidden',
          animation: 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {/* Search bar */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${tCommon('search')}...`}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                color: '#0f172a', background: 'transparent',
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={12} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                {tCommon('noResults')}
              </div>
            ) : (
              filtered.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => { onChange(country.code); setOpen(false); setQuery('') }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    border: 'none',
                    background: value === country.code ? '#f5f3ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (value !== country.code) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (value !== country.code) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{country.flag}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: value === country.code ? 600 : 400, color: value === country.code ? '#0D9488' : '#0f172a' }}>
                    {country.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>{country.code}</span>
                  {value === country.code && (
                    <span style={{ fontSize: 12, color: '#0D9488' }}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
