'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Bike, CalendarDays, Receipt, Settings,
  Wrench, Plus, Search, ArrowRight,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  group: string
}

interface Props {
  tenant: string
}

export default function CommandPalette({ tenant }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Vue d\'ensemble', icon: LayoutDashboard, action: () => router.push(`/${tenant}/dashboard`), group: 'Navigation' },
    { id: 'rentals', label: 'Locations', description: 'Locations en cours', icon: Bike, action: () => router.push(`/${tenant}/rentals`), group: 'Navigation' },
    { id: 'reservations', label: 'Réservations', description: 'Gérer les réservations', icon: CalendarDays, action: () => router.push(`/${tenant}/reservations`), group: 'Navigation' },
    { id: 'bikes', label: 'Flotte', description: 'Gérer les vélos', icon: Wrench, action: () => router.push(`/${tenant}/bikes`), group: 'Navigation' },
    { id: 'accounting', label: 'Comptabilité', description: 'Factures & revenus', icon: Receipt, action: () => router.push(`/${tenant}/accounting`), group: 'Navigation' },
    { id: 'settings', label: 'Paramètres', description: 'Configuration du shop', icon: Settings, action: () => router.push(`/${tenant}/settings`), group: 'Navigation' },
    { id: 'new-rental', label: 'Nouvelle location', description: 'Créer une location maintenant', icon: Plus, action: () => router.push(`/${tenant}/rentals/new`), group: 'Actions' },
    { id: 'new-bike', label: 'Ajouter un vélo', description: 'Enregistrer un nouveau véhicule', icon: Plus, action: () => router.push(`/${tenant}/bikes/new`), group: 'Actions' },
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

  const run = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    cmd.action()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatFiltered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && flatFiltered[selected]) run(flatFiltered[selected])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, flatFiltered, selected, run])

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => { setOpen(false); setQuery('') }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(99,102,241,0.12)',
          animation: 'fadeUp 0.15s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une page ou action..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
          />
          <kbd className="text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Aucun résultat</p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-4 py-2">{group}</p>
                {items.map(cmd => {
                  const idx = itemIndex++
                  const isSelected = idx === selected
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group"
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                      }}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => run(cmd)}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isSelected ? 'rgba(99,102,241,0.15)' : '#f1f5f9',
                        }}
                      >
                        <Icon size={13} style={{ color: isSelected ? '#6366F1' : '#64748b' }} />
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
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400">
          <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">↑↓</kbd> naviguer</span>
          <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">↵</kbd> ouvrir</span>
          <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">⌘K</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
