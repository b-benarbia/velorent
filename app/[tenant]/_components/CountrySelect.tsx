'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

const COUNTRIES = [
  { code: 'FR', name: 'France',           flag: '🇫🇷' },
  { code: 'ES', name: 'Espagne',          flag: '🇪🇸' },
  { code: 'DE', name: 'Allemagne',        flag: '🇩🇪' },
  { code: 'GB', name: 'Royaume-Uni',      flag: '🇬🇧' },
  { code: 'IT', name: 'Italie',           flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal',         flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas',         flag: '🇳🇱' },
  { code: 'BE', name: 'Belgique',         flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse',           flag: '🇨🇭' },
  { code: 'AT', name: 'Autriche',         flag: '🇦🇹' },
  { code: 'PL', name: 'Pologne',          flag: '🇵🇱' },
  { code: 'SE', name: 'Suède',            flag: '🇸🇪' },
  { code: 'NO', name: 'Norvège',          flag: '🇳🇴' },
  { code: 'DK', name: 'Danemark',         flag: '🇩🇰' },
  { code: 'FI', name: 'Finlande',         flag: '🇫🇮' },
  { code: 'IE', name: 'Irlande',          flag: '🇮🇪' },
  { code: 'CZ', name: 'Tchéquie',         flag: '🇨🇿' },
  { code: 'RO', name: 'Roumanie',         flag: '🇷🇴' },
  { code: 'HU', name: 'Hongrie',          flag: '🇭🇺' },
  { code: 'GR', name: 'Grèce',           flag: '🇬🇷' },
  { code: 'HR', name: 'Croatie',          flag: '🇭🇷' },
  { code: 'US', name: 'États-Unis',       flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',           flag: '🇨🇦' },
  { code: 'AU', name: 'Australie',        flag: '🇦🇺' },
  { code: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿' },
  { code: 'JP', name: 'Japon',            flag: '🇯🇵' },
  { code: 'KR', name: 'Corée du Sud',     flag: '🇰🇷' },
  { code: 'CN', name: 'Chine',            flag: '🇨🇳' },
  { code: 'IN', name: 'Inde',             flag: '🇮🇳' },
  { code: 'BR', name: 'Brésil',           flag: '🇧🇷' },
  { code: 'MX', name: 'Mexique',          flag: '🇲🇽' },
  { code: 'AR', name: 'Argentine',        flag: '🇦🇷' },
  { code: 'CO', name: 'Colombie',         flag: '🇨🇴' },
  { code: 'CL', name: 'Chili',            flag: '🇨🇱' },
  { code: 'MA', name: 'Maroc',            flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie',          flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie',          flag: '🇹🇳' },
  { code: 'SN', name: 'Sénégal',          flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire",    flag: '🇨🇮' },
  { code: 'NG', name: 'Nigéria',          flag: '🇳🇬' },
  { code: 'ZA', name: 'Afrique du Sud',   flag: '🇿🇦' },
  { code: 'EG', name: 'Égypte',           flag: '🇪🇬' },
  { code: 'SA', name: 'Arabie Saoudite',  flag: '🇸🇦' },
  { code: 'AE', name: 'Émirats Arabes',   flag: '🇦🇪' },
  { code: 'IL', name: 'Israël',           flag: '🇮🇱' },
  { code: 'TR', name: 'Turquie',          flag: '🇹🇷' },
  { code: 'RU', name: 'Russie',           flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine',          flag: '🇺🇦' },
  { code: 'OTHER', name: 'Autre',         flag: '🌍' },
]

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function CountrySelect({ value, onChange, className }: Props) {
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

  // Fermer si clic dehors
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

  // Focus recherche à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  // Navigation clavier
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
          border: open ? '1.5px solid #6366F1' : '1.5px solid #e2e8f0',
          background: 'white',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
        }}
      >
        {selected ? (
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{selected.flag}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selected.name}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{selected.code}</span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>Sélectionner un pays...</span>
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
          {/* Barre de recherche */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un pays..."
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

          {/* Liste */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                Aucun résultat
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
                  <span style={{ flex: 1, fontSize: 13, fontWeight: value === country.code ? 600 : 400, color: value === country.code ? '#6366F1' : '#0f172a' }}>
                    {country.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>{country.code}</span>
                  {value === country.code && (
                    <span style={{ fontSize: 12, color: '#6366F1' }}>✓</span>
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
