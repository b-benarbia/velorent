'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} {t('rentalsCount').toLowerCase()}</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + {t('newRental')}
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-12">
          {search ? t('noResults') : t('noClients')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/${tenant}/clients/${c.id}`)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
                  {c.firstName[0]}{c.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                    {c.email && <span className="text-xs text-gray-400 truncate max-w-[180px]">{c.email}</span>}
                    {c.nationality && <span className="text-xs text-gray-400">{c.nationality}</span>}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {c.documentNumber ? (
                  <div>
                    <span className="text-xs text-gray-400">{docLabel[c.documentType ?? ''] ?? c.documentType}</span>
                    <p className="text-xs font-mono text-gray-600">{c.documentNumber}</p>
                  </div>
                ) : (
                  <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{t('noDocument')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
