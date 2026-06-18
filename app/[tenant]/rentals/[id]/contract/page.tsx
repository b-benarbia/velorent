import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'

export default async function ContractPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = await params
  await requireSession()

  const rental = await prisma.rental.findUnique({
    where: { id },
    include: {
      bike: true,
      customer: true,
      tenant: true,
    },
  })

  if (!rental) notFound()

  const paymentLabel: Record<string, string> = {
    CASH: 'Efectivo / Espèces',
    CARD: 'Tarjeta / Carte bancaire',
    BIZUM: 'Bizum',
    TRANSFER: 'Transferencia / Virement',
    ONLINE: 'Online',
    HOTEL: 'Hotel',
  }

  const docLabel: Record<string, string> = {
    PASSPORT: 'Pasaporte / Passeport',
    DNI: 'DNI',
    NIE: 'NIE',
    ID_CARD: 'Documento de identidad / Carte d\'identité',
    DRIVING_LICENSE: 'Permiso de conducir / Permis de conduire',
    OTHER: 'Otro / Autre',
  }

  const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`

  return (
    <>
      <div className="no-print flex gap-3 mb-4 p-4">
        <PrintButton />
        <Link href={`/${tenant}/rentals`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
          ← Retour aux locations
        </Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          body { margin: 0; background: white !important; }
          .contract { max-width: 100% !important; box-shadow: none !important; border: none !important; }
        }
        @page { margin: 1.5cm; size: A4; }
        .contract { font-family: 'Arial', sans-serif; }
      `}</style>

      <div className="contract max-w-2xl mx-auto bg-white shadow-sm border border-gray-200 print:border-0 print:shadow-none">

        {/* ── EN-TÊTE ── */}
        <div className="bg-blue-700 text-white px-8 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{rental.tenant.name}</h1>
              {rental.tenant.address && <p className="text-blue-200 text-sm mt-0.5">{rental.tenant.address}</p>}
              <div className="flex gap-4 mt-1 text-sm text-blue-100">
                {rental.tenant.phone && <span>📞 {rental.tenant.phone}</span>}
                {rental.tenant.email && <span>✉ {rental.tenant.email}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs uppercase tracking-widest font-semibold">Contrato de alquiler · Rental Agreement · Contrat de location</p>
              <p className="text-white text-xl font-bold mt-1">N° {contractNumber}</p>
            </div>
          </div>
        </div>

        {/* ── DATE & INFOS ── */}
        <div className="bg-gray-50 border-b border-gray-200 px-8 py-3 flex gap-8 text-sm text-gray-700">
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide">Fecha / Date</span>
            <p className="font-semibold">{new Date(rental.startAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide">Hora / Heure</span>
            <p className="font-semibold">{new Date(rental.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {rental.expectedReturnAt && (
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Devolución / Retour prévu</span>
              <p className="font-semibold">{new Date(rental.expectedReturnAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* ── ARRENDATARIO / LOCATAIRE ── */}
          <section className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Datos del arrendatario / Renter Information / Informations du locataire
              </h2>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-900">
              <div>
                <p className="text-gray-400 text-xs">Nombre completo / Nom complet</p>
                <p className="font-bold text-base">{rental.customer.firstName} {rental.customer.lastName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Nacionalidad / Nationalité</p>
                <p className="font-semibold">{rental.customer.nationality ?? '—'}</p>
              </div>
              {rental.customer.email && (
                <div>
                  <p className="text-gray-400 text-xs">Email</p>
                  <p className="font-semibold">{rental.customer.email}</p>
                </div>
              )}
              {rental.customer.phone && (
                <div>
                  <p className="text-gray-400 text-xs">Teléfono / Téléphone</p>
                  <p className="font-semibold">{rental.customer.phone}</p>
                </div>
              )}
              {(rental.customer as { address?: string }).address && (
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs">Dirección / Adresse</p>
                  <p className="font-semibold">{(rental.customer as { address?: string }).address}</p>
                </div>
              )}
              {rental.customer.documentNumber && (
                <div className="col-span-2 border-t border-gray-100 pt-2 mt-1">
                  <p className="text-gray-400 text-xs">{docLabel[rental.customer.documentType ?? ''] ?? 'Document'}</p>
                  <p className="font-bold font-mono text-base tracking-widest">{rental.customer.documentNumber}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── PHOTO ID ── */}
          {rental.customer.documentPhotoUrl && (
            <section className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Documento de identidad / Pièce d'identité
                </h2>
              </div>
              <div className="p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rental.customer.documentPhotoUrl} alt="Documento" className="max-h-44 rounded object-contain border border-gray-100" />
              </div>
            </section>
          )}

          {/* ── MATERIAL / VÉHICULE ── */}
          <section className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Material alquilado / Rented Equipment / Matériel loué
              </h2>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-900">
              <div>
                <p className="text-gray-400 text-xs">Vehículo / Véhicule</p>
                <p className="font-bold">{rental.bike.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Código / Code</p>
                <p className="font-bold font-mono text-blue-700">{rental.bike.code}</p>
              </div>
              {rental.bike.serialNumber && (
                <div>
                  <p className="text-gray-400 text-xs">N° de série</p>
                  <p className="font-semibold font-mono">{rental.bike.serialNumber}</p>
                </div>
              )}
              {rental.lockNumber && (
                <div>
                  <p className="text-gray-400 text-xs">Candado / Cadenas N°</p>
                  <p className="font-semibold font-mono">{rental.lockNumber}</p>
                </div>
              )}
            </div>

            {/* Accessoires */}
            {Array.isArray(rental.accessories) && (rental.accessories as unknown[]).length > 0 && (
              <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                <p className="text-gray-400 text-xs mb-2">Accesorios entregados / Accessoires remis</p>
                <div className="flex flex-wrap gap-2">
                  {(rental.accessories as { type: string; label: string; qty?: number; codes?: string[] }[]).map((acc, i) => {
                    const validCodes = (acc.codes ?? []).filter(Boolean)
                    return (
                      <span key={i} className="text-sm text-gray-900 font-semibold bg-blue-50 border border-blue-100 rounded px-3 py-1">
                        {acc.qty && acc.qty > 1 ? `${acc.qty}× ` : ''}{acc.label}
                        {validCodes.length > 0 && (
                          <span className="font-mono text-blue-600 ml-1 text-xs">
                            ({validCodes.map(c => `#${c}`).join(', ')})
                          </span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── PAGO / PAIEMENT ── */}
          <section className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Condiciones económicas / Payment Details / Conditions financières
              </h2>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-4 text-sm text-gray-900">
              <div>
                <p className="text-gray-400 text-xs">Importe pagado / Montant payé</p>
                <p className="font-bold text-2xl text-green-700">{Number(rental.amountPaid ?? 0).toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Forma de pago / Mode</p>
                <p className="font-semibold">{paymentLabel[rental.paymentMethod] ?? rental.paymentMethod}</p>
              </div>
              {Number(rental.depositAmount) > 0 && (
                <div>
                  <p className="text-gray-400 text-xs">Fianza / Caution</p>
                  <p className="font-bold text-orange-600">{Number(rental.depositAmount).toFixed(2)} €</p>
                  <p className="text-xs text-gray-500 font-medium">
                    {(rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod === 'CARD'
                      ? 'Tarjeta / Carte bancaire'
                      : 'Efectivo / Espèces'}
                  </p>
                  <p className="text-xs text-gray-400">Reembolsable / Remboursable</p>
                </div>
              )}
            </div>
          </section>

          {/* ── CONDICIONES LEGALES ── */}
          <section className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Condiciones generales · General Terms & Conditions · Conditions générales
              </h2>
            </div>
            <div className="px-4 py-3 text-xs text-gray-700 space-y-2 leading-relaxed">
              <p><strong>1.</strong> El arrendatario declara haber recibido el material en perfectas condiciones. / <em>The renter declares having received the equipment in perfect working condition.</em> / Le locataire déclare avoir reçu le matériel en parfait état.</p>
              <p><strong>2.</strong> El arrendatario es el único responsable de la custodia del material durante el alquiler. / <em>The renter is solely responsible for the safekeeping of the equipment throughout the rental period.</em> / Le locataire est seul responsable de la garde du matériel.</p>
              <p><strong>3.</strong> En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro de reparación o reposición. / <em>In case of theft, loss or damage, the renter shall pay the full cost of repair or replacement.</em> / En cas de vol, perte ou dommage, le locataire paiera le coût total de réparation ou remplacement.</p>
              <p><strong className="text-red-700">4.</strong> <strong>En caso de robo, el arrendatario deberá presentar denuncia policial en un plazo máximo de 24 horas y entregar copia al arrendador. / <em>In case of theft, the renter must file a police report within 24 hours and provide a copy to the rental company.</em> / En cas de vol, le locataire doit déposer plainte auprès de la police dans les 24h et remettre une copie au loueur.</strong></p>
              <p><strong>5.</strong> La fianza quedará retenida hasta la devolución del material en el mismo estado. / <em>The deposit will be held until the equipment is returned in the same condition.</em> / La caution sera conservée jusqu'à la restitution du matériel dans le même état.</p>
              <p><strong>6.</strong> El retraso generará cargos adicionales por cada hora o día de retraso. / <em>Late returns will incur additional charges per hour or day of delay.</em> / Tout retard entraînera des frais supplémentaires par heure ou jour.</p>
              <p><strong>7.</strong> Este contrato tiene plena validez probatoria ante cualquier instancia judicial o administrativa. / <em>This contract has full evidentiary value before any judicial, police or administrative authority.</em> / Ce contrat a pleine valeur probatoire devant toute instance judiciaire ou administrative.</p>
              <p><strong>8.</strong> Datos personales tratados conforme al RGPD (UE 2016/679). / <em>Personal data processed in accordance with GDPR (EU 2016/679).</em> / Données personnelles traitées conformément au RGPD.</p>
            </div>
          </section>

          {/* ── FIRMAS / SIGNATURES ── */}
          <section>
            <div className="grid grid-cols-3 gap-4">
              {/* Signature ouverture client */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-center">
                  Firma cliente (salida)<br/>
                  <span className="font-normal normal-case italic">Client signature (departure)</span><br/>
                  <span className="font-normal normal-case">Signature client (départ)</span>
                </p>
                {rental.openingSignature ? (
                  <div className="border-2 border-gray-300 rounded-lg p-2 bg-white h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rental.openingSignature} alt="Firma" className="max-h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg" />
                )}
                <div className="border-t-2 border-gray-400 mt-3 pt-1">
                  <p className="text-xs text-gray-500 text-center">Fecha / Date / Date : {new Date(rental.startAt).toLocaleDateString('es-ES')}</p>
                </div>
              </div>

              {/* Signature retour client */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-center">
                  Firma cliente (retorno)<br/>
                  <span className="font-normal normal-case italic">Client signature (return)</span><br/>
                  <span className="font-normal normal-case">Signature client (retour)</span>
                </p>
                {rental.closingSignature ? (
                  <div className="border-2 border-gray-300 rounded-lg p-2 bg-white h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rental.closingSignature} alt="Firma retorno" className="max-h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400">A la devolución</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-400 mt-3 pt-1">
                  <p className="text-xs text-gray-500 text-center">Fecha / Date / Date : {rental.endAt ? new Date(rental.endAt).toLocaleDateString('es-ES') : '____/____/______'}</p>
                </div>
              </div>

              {/* Signature staff */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-center">
                  Firma responsable<br/>
                  <span className="font-normal normal-case italic">Staff signature</span><br/>
                  <span className="font-normal normal-case">Signature responsable</span>
                </p>
                {rental.staffSignature ? (
                  <div className="border-2 border-amber-300 rounded-lg p-2 bg-amber-50 h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rental.staffSignature} alt="Firma staff" className="max-h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-amber-400">A la devolución</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-400 mt-3 pt-1">
                  <p className="text-xs text-gray-500 text-center">Fecha / Date / Date : {rental.endAt ? new Date(rental.endAt).toLocaleDateString('es-ES') : '____/____/______'}</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ── FOOTER ── */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-3 flex justify-between items-center text-xs text-gray-400">
          <span>{rental.tenant.name} · {rental.tenant.address ?? 'Valencia, España'}</span>
          <span>Contrato N° {contractNumber} · Generado por VeloRent</span>
        </div>
      </div>
    </>
  )
}
