import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'
import { getTranslations } from 'next-intl/server'

export default async function ContractPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant, id } = await params
  await requireSession()

  const rental = await prisma.rental.findUnique({
    where: { id },
    include: { bike: true, customer: true, tenant: true },
  })

  if (!rental) notFound()

  const tRentals = await getTranslations('rentals')

  const PAYMENT_LABEL: Record<string, string> = {
    CASH: 'Efectivo / Espèces', CARD: 'Tarjeta / Carte bancaire',
    BIZUM: 'Bizum', TRANSFER: 'Transferencia / Virement',
    ONLINE: 'Online', HOTEL: 'Hotel',
  }

  const DOC_LABEL: Record<string, string> = {
    PASSPORT: 'Pasaporte / Passeport', DNI: 'DNI', NIE: 'NIE',
    ID_CARD: "Documento de identidad / Carte d'identité",
    DRIVING_LICENSE: 'Permiso de conducir / Permis de conduire',
    OTHER: 'Otro / Autre',
  }

  const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fmtShort = (d: Date | string) =>
    new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="no-print flex gap-3 mb-6 p-4">
        <PrintButton />
        <Link
          href={`/${tenant}/rentals`}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          ← {tRentals('backToList')}
        </Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; margin-top: 0 !important; }
          body { margin: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contract { max-width: 100% !important; box-shadow: none !important; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 1.2cm 1.5cm; size: A4; }
        .contract { font-family: 'Georgia', 'Times New Roman', serif; color: #0f172a; }
        .contract-mono { font-family: 'Courier New', monospace; }
        .section-label {
          font-family: 'Arial', sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }
      `}</style>

      <div className="contract max-w-2xl mx-auto bg-white print:max-w-full">

        {/* ══════════════════════════════════
            EN-TÊTE OFFICIEL
        ══════════════════════════════════ */}
        <div style={{ background: '#0F172A', padding: '28px 32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Gauche — identité du loueur */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <span style={{ color: 'white', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em', fontFamily: 'Arial, sans-serif' }}>
                  {rental.tenant.name}
                </span>
              </div>
              {rental.tenant.address && (
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '2px' }}>{rental.tenant.address}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                {rental.tenant.phone && <span>{rental.tenant.phone}</span>}
                {rental.tenant.email && <span>{rental.tenant.email}</span>}
              </div>
            </div>

            {/* Droite — N° contrat */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#475569', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Contrato · Contract · Contrat
              </p>
              <p style={{ color: 'white', fontSize: '22px', fontWeight: '700', fontFamily: 'Courier New, monospace', letterSpacing: '0.04em' }}>
                N° {contractNumber}
              </p>
              <p style={{ color: '#475569', fontSize: '10px', fontFamily: 'Arial, sans-serif', marginTop: '4px' }}>
                Generado · {generatedAt}
              </p>
            </div>
          </div>

          {/* Bande date/heure */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '32px' }}>
            <div>
              <p style={{ color: '#475569', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>Fecha / Date</p>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif', textTransform: 'capitalize' }}>{fmtDate(rental.startAt)}</p>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>Hora salida / Heure départ</p>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>{fmtTime(rental.startAt)}</p>
            </div>
            {rental.expectedReturnAt && (
              <div>
                <p style={{ color: '#475569', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>Devolución prevista / Retour prévu</p>
                <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>
                  {new Date(rental.expectedReturnAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            {rental.endAt && (
              <div>
                <p style={{ color: '#475569', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>Devolución real / Retour effectif</p>
                <p style={{ color: '#86efac', fontSize: '13px', fontWeight: '700', fontFamily: 'Arial, sans-serif' }}>{fmtTime(rental.endAt)} · {fmtShort(rental.endAt)}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ══════════════════════════════════
              SECTION 1 — IDENTITÉ LOCATAIRE
          ══════════════════════════════════ */}
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: '10px', fontFamily: 'Arial, sans-serif', fontWeight: '700' }}>1</span>
              </div>
              <h2 className="section-label">
                Datos del arrendatario · Renter Information · Informations du locataire
              </h2>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <p className="section-label" style={{ marginBottom: '3px' }}>Nombre completo / Nom complet / Full name</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {rental.customer.firstName} {rental.customer.lastName}
                </p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: '3px' }}>Nacionalidad / Nationalité</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{rental.customer.nationality ?? '—'}</p>
              </div>
              {rental.customer.phone && (
                <div>
                  <p className="section-label" style={{ marginBottom: '3px' }}>Teléfono / Téléphone</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{rental.customer.phone}</p>
                </div>
              )}
              {rental.customer.email && (
                <div>
                  <p className="section-label" style={{ marginBottom: '3px' }}>Email</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{rental.customer.email}</p>
                </div>
              )}
              {(rental.customer as { address?: string }).address && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p className="section-label" style={{ marginBottom: '3px' }}>Dirección / Adresse</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{(rental.customer as { address?: string }).address}</p>
                </div>
              )}
              {rental.customer.documentNumber && (
                <div style={{ gridColumn: 'span 2', background: '#0f172a', borderRadius: '8px', padding: '12px 16px', marginTop: '4px' }}>
                  <p style={{ color: '#64748b', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {DOC_LABEL[rental.customer.documentType ?? ''] ?? 'Documento de identidad'}
                  </p>
                  <p className="contract-mono" style={{ color: 'white', fontSize: '22px', fontWeight: '700', letterSpacing: '0.08em' }}>
                    {rental.customer.documentNumber}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Photo pièce d'identité */}
          {rental.customer.documentPhotoUrl && (
            <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '10px', fontFamily: 'Arial, sans-serif', fontWeight: '700' }}>2</span>
                </div>
                <h2 className="section-label">Documento de identidad / Pièce d&apos;identité / ID Document</h2>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rental.customer.documentPhotoUrl} alt="Documento" style={{ maxHeight: '180px', borderRadius: '6px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />
              </div>
            </section>
          )}

          {/* ══════════════════════════════════
              SECTION 2 — MATÉRIEL
          ══════════════════════════════════ */}
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '10px', fontFamily: 'Arial, sans-serif', fontWeight: '700' }}>{rental.customer.documentPhotoUrl ? '3' : '2'}</span>
              </div>
              <h2 className="section-label">Material alquilado · Rented Equipment · Matériel loué</h2>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              <div>
                <p className="section-label" style={{ marginBottom: '3px' }}>Vehículo / Véhicule / Vehicle</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{rental.bike.name}</p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: '3px' }}>Código / Code / Reference</p>
                <p className="contract-mono" style={{ fontSize: '16px', fontWeight: '700', color: '#6366F1' }}>{rental.bike.code}</p>
              </div>
              {rental.bike.serialNumber && (
                <div style={{ gridColumn: 'span 2', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px' }}>
                  <p className="section-label" style={{ color: '#92400e', marginBottom: '3px' }}>N° de série / Serial number — CRÍTICO PARA DENUNCIA / CRITICAL FOR POLICE REPORT</p>
                  <p className="contract-mono" style={{ fontSize: '18px', fontWeight: '700', color: '#92400e', letterSpacing: '0.06em' }}>{rental.bike.serialNumber}</p>
                </div>
              )}
              {rental.lockNumber && (
                <div>
                  <p className="section-label" style={{ marginBottom: '3px' }}>Candado / Cadenas / Lock N°</p>
                  <p className="contract-mono" style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{rental.lockNumber}</p>
                </div>
              )}
            </div>

            {/* Accessoires */}
            {Array.isArray(rental.accessories) && (rental.accessories as unknown[]).length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                <p className="section-label" style={{ marginBottom: '8px' }}>Accesorios entregados / Accessories / Accessoires remis</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(rental.accessories as { type: string; label: string; qty?: number; codes?: string[] }[]).map((acc, i) => {
                    const validCodes = (acc.codes ?? []).filter(Boolean)
                    return (
                      <span key={i} style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', fontWeight: '600', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', color: '#0f172a' }}>
                        {acc.qty && acc.qty > 1 ? `${acc.qty}× ` : ''}{acc.label}
                        {validCodes.length > 0 && (
                          <span className="contract-mono" style={{ color: '#6366F1', marginLeft: '4px', fontSize: '11px' }}>
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

          {/* ══════════════════════════════════
              SECTION 3 — CONDITIONS FINANCIÈRES
          ══════════════════════════════════ */}
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '10px', fontFamily: 'Arial, sans-serif', fontWeight: '700' }}>{rental.customer.documentPhotoUrl ? '4' : '3'}</span>
              </div>
              <h2 className="section-label">Condiciones económicas · Payment Details · Conditions financières</h2>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <p className="section-label" style={{ marginBottom: '4px' }}>Importe pagado / Montant</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', fontFamily: 'Arial, sans-serif' }}>
                  {Number(rental.amountPaid ?? 0).toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: '4px' }}>Forma de pago / Mode</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
                  {PAYMENT_LABEL[rental.paymentMethod] ?? rental.paymentMethod}
                </p>
              </div>
              {Number(rental.depositAmount) > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px' }}>
                  <p className="section-label" style={{ color: '#9a3412', marginBottom: '4px' }}>Fianza / Caution / Deposit</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#c2410c', fontFamily: 'Arial, sans-serif' }}>
                    {Number(rental.depositAmount).toFixed(2)} €
                  </p>
                  <p style={{ fontSize: '10px', color: '#9a3412', fontFamily: 'Arial, sans-serif', marginTop: '2px' }}>
                    {(rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod === 'CARD'
                      ? 'Tarjeta / Carte bancaire'
                      : 'Efectivo / Espèces'} · Reembolsable
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ══════════════════════════════════
              CONDITIONS GÉNÉRALES LÉGALES
          ══════════════════════════════════ */}
          <section style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ color: 'white', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Condiciones generales · General Terms & Conditions · Conditions générales
              </h2>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                {
                  n: '1',
                  es: 'El arrendatario declara haber recibido el material en perfectas condiciones.',
                  en: 'The renter declares having received the equipment in perfect working condition.',
                  fr: 'Le locataire déclare avoir reçu le matériel en parfait état.',
                  highlight: false,
                },
                {
                  n: '2',
                  es: 'El arrendatario es el único responsable de la custodia del material durante el alquiler.',
                  en: 'The renter is solely responsible for the safekeeping of the equipment throughout the rental period.',
                  fr: 'Le locataire est seul responsable de la garde du matériel.',
                  highlight: false,
                },
                {
                  n: '3',
                  es: 'En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro de reparación o reposición.',
                  en: 'In case of theft, loss or damage, the renter shall pay the full cost of repair or replacement.',
                  fr: 'En cas de vol, perte ou dommage, le locataire paiera le coût total de réparation ou remplacement.',
                  highlight: false,
                },
                {
                  n: '4',
                  es: 'En caso de robo, el arrendatario deberá presentar denuncia policial en un plazo máximo de 24 horas y entregar copia al arrendador.',
                  en: 'In case of theft, the renter must file a police report within 24 hours and provide a copy to the rental company.',
                  fr: 'En cas de vol, le locataire doit déposer plainte auprès de la police dans les 24h et remettre une copie au loueur.',
                  highlight: true,
                },
                {
                  n: '5',
                  es: 'La fianza quedará retenida hasta la devolución del material en el mismo estado.',
                  en: 'The deposit will be held until the equipment is returned in the same condition.',
                  fr: "La caution sera conservée jusqu'à la restitution du matériel dans le même état.",
                  highlight: false,
                },
                {
                  n: '6',
                  es: 'El retraso generará cargos adicionales por cada hora o día de retraso.',
                  en: 'Late returns will incur additional charges per hour or day of delay.',
                  fr: 'Tout retard entraînera des frais supplémentaires par heure ou jour.',
                  highlight: false,
                },
                {
                  n: '7',
                  es: 'Este contrato tiene plena validez probatoria ante cualquier instancia judicial o administrativa.',
                  en: 'This contract has full evidentiary value before any judicial, police or administrative authority.',
                  fr: 'Ce contrat a pleine valeur probatoire devant toute instance judiciaire ou administrative.',
                  highlight: false,
                },
                {
                  n: '8',
                  es: 'Datos personales tratados conforme al RGPD (UE 2016/679).',
                  en: 'Personal data processed in accordance with GDPR (EU 2016/679).',
                  fr: 'Données personnelles traitées conformément au RGPD.',
                  highlight: false,
                },
              ].map(clause => (
                <div
                  key={clause.n}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: clause.highlight ? '1.5px solid #fca5a5' : '1px solid #f1f5f9',
                    background: clause.highlight ? '#fff5f5' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{
                      minWidth: '20px', height: '20px', borderRadius: '50%',
                      background: clause.highlight ? '#dc2626' : '#0f172a',
                      color: 'white', fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
                    }}>
                      {clause.n}
                    </span>
                    <div style={{ fontSize: '11px', lineHeight: '1.6', color: clause.highlight ? '#7f1d1d' : '#374151' }}>
                      <span style={{ fontWeight: clause.highlight ? '700' : '400' }}>{clause.es}</span>
                      {' '}<span style={{ fontStyle: 'italic', color: clause.highlight ? '#991b1b' : '#6b7280' }}>/ {clause.en}</span>
                      {' '}<span style={{ color: clause.highlight ? '#b91c1c' : '#9ca3af' }}>/ {clause.fr}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════
              SIGNATURES
          ══════════════════════════════════ */}
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="section-label">Firmas y conformidad · Signatures & Acknowledgment · Signatures et accord</h2>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

              {/* Signature client départ */}
              <div>
                <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', textAlign: 'center', marginBottom: '6px', lineHeight: 1.5 }}>
                  Firma cliente (salida)<br/>
                  <span style={{ fontStyle: 'italic', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>Signature départ</span>
                </p>
                <div style={{
                  height: '90px', borderRadius: '8px', overflow: 'hidden',
                  border: rental.openingSignature ? '1.5px solid #cbd5e1' : '1.5px dashed #cbd5e1',
                  background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rental.openingSignature
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={rental.openingSignature} alt="Firma salida" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: '4px' }} />
                    : <span style={{ fontSize: '10px', color: '#cbd5e1', fontFamily: 'Arial, sans-serif' }}>—</span>
                  }
                </div>
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1.5px solid #94a3b8' }}>
                  <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#64748b', textAlign: 'center' }}>
                    Fecha / Date : {fmtShort(rental.startAt)}
                  </p>
                </div>
              </div>

              {/* Signature client retour */}
              <div>
                <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', textAlign: 'center', marginBottom: '6px', lineHeight: 1.5 }}>
                  Firma cliente (retorno)<br/>
                  <span style={{ fontStyle: 'italic', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>Signature retour</span>
                </p>
                <div style={{
                  height: '90px', borderRadius: '8px', overflow: 'hidden',
                  border: rental.closingSignature ? '1.5px solid #cbd5e1' : '1.5px dashed #e2e8f0',
                  background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rental.closingSignature
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={rental.closingSignature} alt="Firma retorno" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: '4px' }} />
                    : <span style={{ fontSize: '10px', color: '#e2e8f0', fontFamily: 'Arial, sans-serif' }}>À la restitution</span>
                  }
                </div>
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1.5px solid #94a3b8' }}>
                  <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#64748b', textAlign: 'center' }}>
                    Fecha / Date : {rental.endAt ? fmtShort(rental.endAt) : '___/___/______'}
                  </p>
                </div>
              </div>

              {/* Signature staff */}
              <div>
                <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', textAlign: 'center', marginBottom: '6px', lineHeight: 1.5 }}>
                  Firma responsable<br/>
                  <span style={{ fontStyle: 'italic', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>Signature responsable</span>
                </p>
                <div style={{
                  height: '90px', borderRadius: '8px', overflow: 'hidden',
                  border: rental.staffSignature ? '1.5px solid #6366F1' : '1.5px dashed #e2e8f0',
                  background: rental.staffSignature ? 'white' : '#fafbff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rental.staffSignature
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={rental.staffSignature} alt="Firma staff" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: '4px' }} />
                    : <span style={{ fontSize: '10px', color: '#e2e8f0', fontFamily: 'Arial, sans-serif' }}>À la restitution</span>
                  }
                </div>
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1.5px solid #94a3b8' }}>
                  <p style={{ fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#64748b', textAlign: 'center' }}>
                    Fecha / Date : {rental.endAt ? fmtShort(rental.endAt) : '___/___/______'}
                  </p>
                </div>
              </div>

            </div>
          </section>

        </div>

        {/* ══════════════════════════════════
            FOOTER OFFICIEL
        ══════════════════════════════════ */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#94a3b8' }}>
            {rental.tenant.name} · {rental.tenant.address ?? ''} · Generado por VeloRent
          </span>
          <span style={{ fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#94a3b8', fontWeight: '600' }}>
            Contrato N° {contractNumber} · {generatedAt}
          </span>
        </div>

      </div>
    </>
  )
}
