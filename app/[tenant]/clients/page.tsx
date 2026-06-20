'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, Plus, ChevronRight, FileText, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  documentType: string | null
  documentNumber: string | null
  createdAt: string
}

export default function ClientsPage() {
  const params = useParams()
  const router = useRouter()
  const tenant = params.tenant as string
  const t = useTranslations('clients')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.documentNumber ?? '').toLowerCase().includes(q)
    )
  })

  const docLabel: Record<string, string> = {
    PASSPORT:        t('passport'),
    DNI:             'DNI',
    NIE:             'NIE',
    ID_CARD:         t('idCard'),
    DRIVING_LICENSE: t('drivingLicense'),
    OTHER:           t('other'),
  }

  const initials = (c: Customer) =>
    `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase()

  // Color per initials — deterministic
  const COLORS = [
    ['#eef2ff','#6366F1'],
    ['#ecfdf5','#059669'],
    ['#fff7ed','#ea580c'],
    ['#fdf4ff','#9333ea'],
    ['#fef2f2','#dc2626'],
    ['#f0f9ff','#0284c7'],
  ]
  function avatarColor(name: string): [string, string] {
    let h = 0
    for (const c of name) h = ((h * 31) + c.charCodeAt(0)) & 0x7fffffff
    return COLORS[h % COLORS.length]
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{customers.length} {t('rentalsCount').toLowerCase()}</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}
        >
          <Plus size={14} /> {t('newRental')}
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center">
          <div className="flex justify-center mb-3">
            <Users size={32} className="text-slate-200" />
          </div>
          <p className="text-slate-400 text-sm">
            {search ? t('noResults') : t('noClients')}
          </p>
          {!search && (
            <Link
              href={`/${tenant}/rentals/new`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold mt-4 px-4 py-2.5 rounded-xl text-white active:scale-95 transition-all"
              style={{ background: '#6366F1' }}
            >
              <Plus size={13} /> {t('newRental')}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(c => {
              const [bg, fg] = avatarColor(c.firstName + c.lastName)
              const hasDoc = !!c.documentNumber
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/${tenant}/clients/${c.id}`)}
                  className="w-full text-left px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: bg, color: fg }}
                  >
                    {initials(c)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.phone && (
                        <span className="text-xs text-slate-400">{c.phone}</span>
                      )}
                      {c.email && (
                        <span className="text-xs text-slate-300 truncate max-w-[160px] hidden sm:inline">
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document badge / right */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasDoc ? (
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 leading-none mb-0.5">
                          {docLabel[c.documentType ?? ''] ?? c.documentType}
                        </p>
                        <p className="text-xs font-mono text-slate-600">{c.documentNumber}</p>
                      </div>
                    ) : (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={9} /> {t('noDocument')}
                      </span>
                    )}
                    {/* Mobile doc indicator */}
                    {hasDoc ? (
                      <div className="sm:hidden">
                        <FileText size={13} className="text-slate-300" />
                      </div>
                    ) : (
                      <div className="sm:hidden">
                        <AlertTriangle size={13} className="text-amber-400" />
                      </div>
                    )}
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
