'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Rental {
  id: string
  status: string
  startAt: string
  endAt: string | null
  expectedReturnAt: string | null
  amountPaid: number | null
  paymentMethod: string
  bike: { name: string; code: string }
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  documentType: string | null
  documentNumber: string | null
  documentPhotoUrl: string | null
  notes: string | null
  createdAt: string
  rentals: Rental[]
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenant = params.tenant as string
  const id = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(setCustomer)
  }, [id])

  if (!customer) return <div className="text-gray-400 text-sm p-6">Chargement...</div>

  const docLabel: Record<string, string> = {
    PASSPORT: 'Passeport', DNI: 'DNI', NIE: 'NIE',
    ID_CARD: "Carte d'identité", DRIVING_LICENSE: 'Permis de conduire', OTHER: 'Autre',
  }

  const paymentLabel: Record<string, string> = {
    CASH: 'Espèces', CARD: 'Carte', BIZUM: 'Bizum', TRANSFER: 'Virement',
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Annulée', color: 'bg-gray-100 text-gray-500' },
    OVERDUE: { label: 'En retard', color: 'bg-red-100 text-red-700' },
  }

  const totalSpent = customer.rentals
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + Number(r.amountPaid ?? 0), 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Retour</button>
        <h1 className="text-xl font-bold text-gray-900">Fiche client</h1>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center flex-shrink-0 uppercase">
            {customer.firstName[0]}{customer.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{customer.firstName} {customer.lastName}</h2>
            {customer.nationality && <p className="text-sm text-gray-500">{customer.nationality}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-sm">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline truncate">{customer.email}</a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
          {customer.documentNumber && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{docLabel[customer.documentType ?? ''] ?? customer.documentType}</p>
              <p className="font-mono font-medium text-gray-900">{customer.documentNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Client depuis</p>
            <p className="text-gray-900">{new Date(customer.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total dépensé</p>
            <p className="font-semibold text-green-700">{totalSpent.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Locations</p>
            <p className="text-gray-900">{customer.rentals.length}</p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* ID Photo */}
      {customer.documentPhotoUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Pièce d'identité</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={customer.documentPhotoUrl} alt="Pièce d'identité" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
        </div>
      )}

      {/* Rental history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Historique des locations</h3>
        </div>

        {customer.rentals.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">Aucune location</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {customer.rentals.map(r => {
              const st = statusLabel[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }
              return (
                <Link
                  key={r.id}
                  href={`/${tenant}/rentals/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{r.bike.name}</span>
                      <span className="font-mono text-xs text-gray-400">{r.bike.code}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(r.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {r.endAt && ` → ${new Date(r.endAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{Number(r.amountPaid ?? 0).toFixed(2)} €</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* New rental CTA */}
      <div className="mt-4">
        <Link
          href={`/${tenant}/rentals/new`}
          className="block text-center bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          + Nouvelle location pour ce client
        </Link>
      </div>
    </div>
  )
}
