'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Download } from 'lucide-react'

interface Invoice {
  id: string
  number: string
  issuedAt: string
  amountHt: number
  taxRate: number
  amountTtc: number
  currency: string
  rental: {
    id: string
    paymentMethod: string
    customer: { firstName: string; lastName: string }
    bike: { name: string; code: string }
  }
}

const paymentLabel: Record<string, string> = {
  CASH: 'Espèces', CARD: 'Carte', BIZUM: 'Bizum', TRANSFER: 'Virement',
}

export default function AccountingPage() {
  const params = useParams()
  const tenant = params.tenant as string

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState<string>('') // "2025-06"

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  // Available months
  const months = Array.from(
    new Set(invoices.map(inv => inv.issuedAt.slice(0, 7)))
  ).sort().reverse()

  const filtered = monthFilter
    ? invoices.filter(inv => inv.issuedAt.startsWith(monthFilter))
    : invoices

  const totalHt = filtered.reduce((s, inv) => s + Number(inv.amountHt), 0)
  const totalTtc = filtered.reduce((s, inv) => s + Number(inv.amountTtc), 0)
  const totalTva = totalTtc - totalHt

  function exportCSV() {
    const rows = [
      ['Numéro', 'Date', 'Client', 'Vélo', 'Code', 'Paiement', 'HT (€)', 'TVA (%)', 'TTC (€)', 'Devise'],
      ...filtered.map(inv => [
        inv.number,
        new Date(inv.issuedAt).toLocaleDateString('fr-FR'),
        `${inv.rental.customer.firstName} ${inv.rental.customer.lastName}`,
        inv.rental.bike.name,
        inv.rental.bike.code,
        paymentLabel[inv.rental.paymentMethod] ?? inv.rental.paymentMethod,
        Number(inv.amountHt).toFixed(2),
        (Number(inv.taxRate) * 100).toFixed(0),
        Number(inv.amountTtc).toFixed(2),
        inv.currency,
      ]),
    ]

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `velorent-factures${monthFilter ? `-${monthFilter}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} facture{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          <Download size={14} className="inline mr-1.5" />Exporter CSV
        </button>
      </div>

      {/* Filters + summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Month filter */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium block mb-2">Filtrer par mois</label>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toute la période</option>
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Totals */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-400 uppercase tracking-wide font-medium mb-2">Totaux {monthFilter ? new Date(monthFilter + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'période'}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">HT</p>
              <p className="font-bold text-gray-900 text-sm">{totalHt.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TVA</p>
              <p className="font-bold text-amber-700 text-sm">{totalTva.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TTC</p>
              <p className="font-bold text-green-700 text-sm">{totalTtc.toFixed(2)} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-12">Aucune facture{monthFilter ? ' ce mois' : ''}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Numéro</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Vélo</th>
                  <th className="text-left px-4 py-3">Paiement</th>
                  <th className="text-right px-4 py-3">HT</th>
                  <th className="text-right px-4 py-3">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.number}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(inv.issuedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {inv.rental.customer.firstName} {inv.rental.customer.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span>{inv.rental.bike.name}</span>
                      <span className="text-gray-400 font-mono ml-1 text-xs">{inv.rental.bike.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {paymentLabel[inv.rental.paymentMethod] ?? inv.rental.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{Number(inv.amountHt).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{Number(inv.amountTtc).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{totalHt.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{totalTtc.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
