'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  LayoutDashboard, Bike, CalendarDays, Receipt, Settings,
  Wrench, Plus, Search, ArrowRight, Sparkles, Loader2,
  RotateCcw, AlertCircle,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  group: string
}

type Mode = 'command' | 'loading' | 'answer' | 'error'

interface Props {
  tenant: string
}

export default function CommandPalette({ tenant }: Props) {
  const router = useRouter()
  const locale = useLocale()
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tRentals = useTranslations('rentals')
  const tBikes = useTranslations('bikes')
  const tCopilot = useTranslations('copilot')

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<Mode>('command')
  const [aiAnswer, setAiAnswer] = useState('')
  const [displayedAnswer, setDisplayedAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = [
    { id: 'dashboard',   label: tNav('dashboard'),      description: tCopilot('descDashboard'),   icon: LayoutDashboard, action: () => router.push(`/${tenant}/dashboard`),   group: tCopilot('groupNav') },
    { id: 'rentals',     label: tNav('rentals'),         description: tCopilot('descRentals'),     icon: Bike,            action: () => router.push(`/${tenant}/rentals`),      group: tCopilot('groupNav') },
    { id: 'reservations',label: tNav('reservations'),    description: tCopilot('descReservations'),icon: CalendarDays,    action: () => router.push(`/${tenant}/reservations`), group: tCopilot('groupNav') },
    { id: 'bikes',       label: tNav('bikes'),           description: tCopilot('descBikes'),       icon: Wrench,          action: () => router.push(`/${tenant}/bikes`),        group: tCopilot('groupNav') },
    { id: 'accounting',  label: tNav('accounting'),      description: tCopilot('descAccounting'),  icon: Receipt,         action: () => router.push(`/${tenant}/accounting`),   group: tCopilot('groupNav') },
    { id: 'settings',    label: tNav('settings'),        description: tCopilot('descSettings'),    icon: Settings,        action: () => router.push(`/${tenant}/settings`),     group: tCopilot('groupNav') },
    { id: 'new-rental',  label: tRentals('new'),         description: tCopilot('descNewRental'),   icon: Plus,            action: () => router.push(`/${tenant}/rentals/new`),  group: tCopilot('groupActions') },
    { id: 'new-bike',    label: tBikes('add'),           description: tCopilot('descNewBike'),     icon: Plus,            action: () => router.push(`/${tenant}/bikes/new`),    group: tCopilot('groupActions') },
  ]

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        (c.description?.toLowerCase().includes(query.toLowerCase()))
      )
    : commands

  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = []
    acc[cmd.group].push(cmd)
    return acc
  }, {})

  const flatFiltered = Object.values(groups).flat()
  const showAiOption = query.trim().length >= 2 && mode === 'command'
  const totalOptions = flatFiltered.length + (showAiOption ? 1 : 0)

  const askAI = useCallback(async (q: string) => {
    if (!q.trim()) return
    setMode('loading')
    setAiAnswer('')
    setDisplayedAnswer('')
    try {
      const res = await fetch(`/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, locale }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur')
      setAiAnswer(data.answer)
      setMode('answer')
    } catch {
      setMode('error')
    }
  }, [locale])

  // Typewriter effect
  useEffect(() => {
    if (mode !== 'answer' || !aiAnswer) return
    setDisplayedAnswer('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayedAnswer(aiAnswer.slice(0, i))
      if (i >= aiAnswer.length) clearInterval(interval)
    }, 12)
    return () => clearInterval(interval)
  }, [mode, aiAnswer])

  const run = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    setMode('command')
    cmd.action()
  }, [])

  const reset = useCallback(() => {
    setMode('command')
    setAiAnswer('')
    setDisplayedAnswer('')
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setMode('command')
    setAiAnswer('')
    setDisplayedAnswer('')
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
        setMode('command')
      }
      if (!open) return
      if (e.key === 'Escape') { close() }
      if (mode !== 'command') return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, totalOptions - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        if (showAiOption && selected === totalOptions - 1) {
          askAI(query)
        } else if (flatFiltered[selected]) {
          run(flatFiltered[selected])
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, flatFiltered, selected, run, close, askAI, query, showAiOption, totalOptions, mode])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelected(0)
    }
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  let itemIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(13,148,136,0.12)',
          animation: 'fadeUp 0.15s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {mode === 'loading' ? (
            <Loader2 size={16} className="text-indigo-500 flex-shrink-0 animate-spin" />
          ) : mode === 'answer' ? (
            <Sparkles size={16} className="flex-shrink-0" style={{ color: '#0D9488' }} />
          ) : (
            <Search size={16} className="text-slate-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); if (mode !== 'command') reset() }}
            placeholder={mode === 'answer' ? tCopilot('newQuestionPlaceholder') : tNav('search')}
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
            disabled={mode === 'loading'}
          />
          <kbd className="text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* ── Loading ── */}
        {mode === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
              <Sparkles size={16} color="white" />
            </div>
            <p className="text-sm text-slate-400">{tCopilot('thinking')}</p>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                  style={{ animation: `copilotBounce 1.2s ease ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Answer ── */}
        {mode === 'answer' && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0D9488,#0891B2)' }}>
                <Sparkles size={11} color="white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#0D9488' }}>
                VeloRent Copilot
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[2.5rem]">
              {displayedAnswer}
              {displayedAnswer.length < aiAnswer.length && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-indigo-400 animate-pulse align-middle" />
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <RotateCcw size={12} />
                {tCopilot('newQuestion')}
              </button>
              <span className="text-slate-200">·</span>
              <p className="text-[11px] text-slate-400">{tCopilot('answerHint')}</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {mode === 'error' && (
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-slate-500">{tCopilot('error')}</p>
            <button
              onClick={reset}
              className="text-xs font-medium text-indigo-500 hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} /> {tCopilot('retry')}
            </button>
          </div>
        )}

        {/* ── Commands list ── */}
        {mode === 'command' && (
          <div className="max-h-80 overflow-y-auto py-2">
            {flatFiltered.length === 0 && !showAiOption ? (
              <p className="text-sm text-slate-400 text-center py-8">{tCommon('noResults')}</p>
            ) : (
              <>
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-4 py-2">{group}</p>
                    {items.map(cmd => {
                      const idx = itemIndex++
                      const isSelected = idx === selected
                      const Icon = cmd.icon
                      return (
                        <button
                          key={cmd.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ background: isSelected ? 'rgba(13,148,136,0.08)' : 'transparent' }}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => run(cmd)}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: isSelected ? 'rgba(13,148,136,0.15)' : '#f1f5f9' }}
                          >
                            <Icon size={13} style={{ color: isSelected ? '#0D9488' : '#64748b' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-xs text-slate-400 truncate">{cmd.description}</p>
                            )}
                          </div>
                          {isSelected && <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                ))}

                {/* ── AI option ── */}
                {showAiOption && (() => {
                  const aiIdx = itemIndex
                  const isSelected = aiIdx === selected
                  return (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-4 py-2">
                        {tCopilot('groupAI')}
                      </p>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg,rgba(13,148,136,0.1),rgba(139,92,246,0.1))'
                            : 'transparent',
                        }}
                        onMouseEnter={() => setSelected(aiIdx)}
                        onClick={() => askAI(query)}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected
                              ? 'linear-gradient(135deg,#0D9488,#0891B2)'
                              : 'linear-gradient(135deg,#e0e7ff,#ede9fe)',
                          }}
                        >
                          <Sparkles size={13} color={isSelected ? 'white' : '#0D9488'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#0D9488' }}>
                            {tCopilot('askAI')}
                          </p>
                          <p className="text-xs text-slate-400 truncate">&ldquo;{query}&rdquo;</p>
                        </div>
                        {isSelected && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(13,148,136,0.1)', color: '#0D9488' }}
                          >
                            ↵
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {mode === 'command' && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400">
            <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">↑↓</kbd> {tCopilot('footerNavigate')}</span>
            <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">↵</kbd> {tCopilot('footerOpen')}</span>
            <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">⌘K</kbd> {tCopilot('footerClose')}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes copilotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
