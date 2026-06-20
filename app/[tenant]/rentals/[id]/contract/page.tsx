import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'
import { getServerT } from '@/lib/server-t'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

  if (!rental) notFound()

  const tRentals = await getServerT('rentals')

  const PAYMENT_LABEL: Record<string, string> = {
    CASH: 'Efectivo / Espèces', CARD: 'Tarjeta / Carte',
    BIZUM: 'Bizum', TRANSFER: 'Transferencia / Virement',
    ONLINE: 'Online', HOTEL: 'Hotel',
  }
  const DOC_LABEL: Record<string, string> = {
    PASSPORT: 'Pasaporte / Passeport', DNI: 'DNI', NIE: 'NIE',
    ID_CARD: "Documento / Carte d'identité",
    DRIVING_LICENSE: 'Permiso conducir / Permis conduire',
    OTHER: 'Otro / Autre',
  }

  const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const isCompleted = rental.status === 'COMPLETED'

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fmtShort = (d: Date | string) =>
    new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="no-print flex gap-3 mb-8 px-4 pt-4">
        <PrintButton />
        <a
          href={`/api/rentals/${id}/contract-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F172A', color: 'white', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
        >
          ⬇ PDF
        </a>
        <Link
          href={`/${tenant}/rentals`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
        >
          ← {tRentals('backToList')}
        </Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          body { margin: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contract-wrap { max-width: 100% !important; box-shadow: none !important; margin: 0 !important; }
        }
        @page { margin: 1cm 1.4cm; size: A4; }

        .contract-wrap {
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          color: #0F172A;
          max-width: 720px;
          margin: 0 auto 48px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(15,23,42,0.08);
          border-radius: 2px;
          overflow: hidden;
        }

        /* Section label */
        .s-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 5px;
        }
        .s-value {
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
          line-height: 1.4;
        }
        .s-mono {
          font-family: 'Courier New', monospace;
          letter-spacing: 0.04em;
        }

        /* Info grid cell */
        .info-cell { display: flex; flex-direction: column; }

        /* Divider */
        .doc-divider {
          height: 1px;
          background: #F1F5F9;
          margin: 0 32px;
        }

        /* Section */
        .doc-section {
          padding: 24px 32px;
        }

        /* Section title */
        .sec-title {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #CBD5E1;
          padding-bottom: 14px;
          border-bottom: 1px solid #F1F5F9;
          margin-bottom: 18px;
        }

        /* Clause */
        .clause-row {
          display: flex;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid #F8FAFC;
          align-items: flex-start;
        }
        .clause-row:last-child { border-bottom: none; }
        .clause-num {
          min-width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          color: #64748B;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .clause-num.alert { background: #FEE2E2; color: #DC2626; }
        .clause-text {
          font-size: 10.5px;
          line-height: 1.65;
          color: #475569;
        }
        .clause-text em { font-style: italic; color: #94A3B8; }
      `}</style>

      <div className="contract-wrap">

        {/* ══════════════════════════════════
            HEADER
        ══════════════════════════════════ */}
        <div style={{ background: '#0F172A', padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>

            {/* Left — Shop */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
                    <path d="M8 17.5h7M15 6l2 4h-8l1-4h5z"/>
                    <path d="M12 6V3"/><path d="M17 10l2 7.5"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: 'white', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {rental.tenant.name}
                  </p>
                  {rental.tenant.address && (
                    <p style={{ color: '#475569', fontSize: 11, marginTop: 3 }}>{rental.tenant.address}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {rental.tenant.phone && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>{rental.tenant.phone}</span>
                )}
                {rental.tenant.email && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>{rental.tenant.email}</span>
                )}
              </div>
            </div>

            {/* Right — Contract ref */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
                Contrato · Contrat · Contract
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: 'white', fontFamily: 'Courier New, monospace', letterSpacing: '0.06em', lineHeight: 1 }}>
                {contractNumber}
              </p>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                {generatedAt}
              </p>
              {/* Status badge */}
              <div style={{
                display: 'inline-block', marginTop: 10,
                background: isCompleted ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.15)',
                border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                borderRadius: 6, padding: '3px 10px',
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: isCompleted ? '#4ADE80' : '#818CF8',
              }}>
                {isCompleted ? '✓ Clôturé' : '● Actif'}
              </div>
            </div>
          </div>

          {/* Date strip */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 36, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>Salida / Départ</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white', textTransform: 'capitalize' }}>{fmtDate(rental.startAt)}</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{fmtTime(rental.startAt)}</p>
            </div>
            {rental.expectedReturnAt && (
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>Devolución prevista / Retour prévu</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                  {new Date(rental.expectedReturnAt).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                  {fmtTime(rental.expectedReturnAt)}
                </p>
              </div>
            )}
            {rental.endAt && (
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>Devolución real / Retour effectif</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>{fmtShort(rental.endAt)}</p>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{fmtTime(rental.endAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            SECTION 1 — CLIENT + MONTANTS
        ══════════════════════════════════ */}
        <div className="doc-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

          {/* Client */}
          <div>
            <p className="sec-title">Arrendatario · Locataire · Renter</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="info-cell">
                <p className="s-label">Nombre / Nom</p>
                <p className="s-value" style={{ fontSize: 18, fontWeight: 800 }}>
                  {rental.customer.firstName} {rental.customer.lastName}
                </p>
              </div>
              {rental.customer.nationality && (
                <div className="info-cell">
                  <p className="s-label">Nacionalidad / Nationalité</p>
                  <p className="s-value">{rental.customer.nationality}</p>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {rental.customer.phone && (
                  <div className="info-cell">
                    <p className="s-label">Teléfono / Tél.</p>
                    <p className="s-value s-mono" style={{ fontSize: 13 }}>{rental.customer.phone}</p>
                  </div>
                )}
                {rental.customer.email && (
                  <div className="info-cell">
                    <p className="s-label">Email</p>
                    <p className="s-value" style={{ fontSize: 12 }}>{rental.customer.email}</p>
                  </div>
                )}
              </div>
              {rental.customer.documentNumber && (
                <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', marginTop: 2 }}>
                  <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                    {DOC_LABEL[rental.customer.documentType ?? ''] ?? 'Documento'}
                  </p>
                  <p className="s-mono" style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '0.08em' }}>
                    {rental.customer.documentNumber}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financier */}
          <div>
            <p className="sec-title">Condiciones económicas · Financier</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="info-cell">
                <p className="s-label">Importe pagado / Montant réglé</p>
                <p className="s-value" style={{ fontSize: 28, fontWeight: 800, color: '#16A34A', letterSpacing: '-0.02em' }}>
                  {Number(rental.amountPaid ?? 0).toFixed(2)} <span style={{ fontSize: 16 }}>€</span>
                </p>
              </div>
              <div className="info-cell">
                <p className="s-label">Forma de pago / Mode</p>
                <p className="s-value">{PAYMENT_LABEL[rental.paymentMethod] ?? rental.paymentMethod}</p>
              </div>
              {Number(rental.depositAmount) > 0 && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: '#9A3412', textTransform: 'uppercase', marginBottom: 5 }}>
                    Fianza / Caution / Deposit
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#C2410C', fontFamily: 'Courier New, monospace' }}>
                    {Number(rental.depositAmount).toFixed(2)} €
                  </p>
                  <p style={{ fontSize: 10, color: '#9A3412', marginTop: 3 }}>
                    {(rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod === 'CARD'
                      ? 'Tarjeta / Carte bancaire'
                      : 'Efectivo / Espèces'}
                    {' · '}Reembolsable / Remboursable
                  </p>
                </div>
              )}
              {rental.lockNumber && (
                <div className="info-cell">
                  <p className="s-label">Candado N° / Cadenas</p>
                  <p className="s-value s-mono">{rental.lockNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photo pièce d'identité */}
        {rental.customer.documentPhotoUrl && (
          <>
            <div className="doc-divider" />
            <div className="doc-section">
              <p className="sec-title">Documento de identidad · Pièce d&apos;identité · ID Document</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rental.customer.documentPhotoUrl}
                alt="Documento"
                style={{ maxHeight: 160, borderRadius: 8, border: '1px solid #E2E8F0', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            SECTION 2 — VÉHICULE
        ══════════════════════════════════ */}
        <div className="doc-divider" />
        <div className="doc-section">
          <p className="sec-title">Material alquilado · Matériel loué · Rented Equipment</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div className="info-cell" style={{ gridColumn: 'span 2' }}>
              <p className="s-label">Vehículo / Véhicule</p>
              <p className="s-value" style={{ fontSize: 20, fontWeight: 800 }}>{rental.bike.name}</p>
              {rental.bike.type && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{rental.bike.type}</p>
              )}
            </div>
            <div className="info-cell">
              <p className="s-label">Código / Code</p>
              <p className="s-value s-mono" style={{ color: '#6366F1', fontSize: 18 }}>{rental.bike.code}</p>
            </div>
          </div>

          {/* Serial number — highlighted */}
          {rental.bike.serialNumber && (
            <div style={{ marginTop: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: '#92400E', textTransform: 'uppercase', marginBottom: 3 }}>
                  N° Serie / N° Série · CRÍTICO DENUNCIA / POLICE REPORT
                </p>
                <p className="s-mono" style={{ fontSize: 16, fontWeight: 800, color: '#92400E', letterSpacing: '0.08em' }}>
                  {rental.bike.serialNumber}
                </p>
              </div>
            </div>
          )}

          {/* Accessories */}
          {Array.isArray(rental.accessories) && (rental.accessories as unknown[]).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p className="s-label" style={{ marginBottom: 8 }}>Accesorios entregados / Accessoires remis / Accessories</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(rental.accessories as { label: string; qty?: number; codes?: string[] }[]).map((acc, i) => {
                  const validCodes = (acc.codes ?? []).filter(Boolean)
                  return (
                    <span key={i} style={{ fontSize: 12, fontWeight: 600, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', color: '#334155' }}>
                      {acc.qty && acc.qty > 1 ? `${acc.qty}× ` : ''}{acc.label}
                      {validCodes.length > 0 && (
                        <span className="s-mono" style={{ color: '#6366F1', marginLeft: 4, fontSize: 11 }}>
                          ({validCodes.map(c => `#${c}`).join(', ')})
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════
            CONDITIONS GÉNÉRALES
        ══════════════════════════════════ */}
        <div className="doc-divider" />
        <div className="doc-section" style={{ paddingBottom: 20 }}>
          <p className="sec-title">Condiciones generales · General Conditions · Conditions générales</p>
          <div>
            {[
              { n: '1', alert: false, es: 'El arrendatario declara haber recibido el material en perfectas condiciones.', en: 'The renter declares having received the equipment in perfect condition.', fr: 'Le locataire déclare avoir reçu le matériel en parfait état.' },
              { n: '2', alert: false, es: 'El arrendatario es el único responsable de la custodia del material durante el alquiler.', en: 'The renter is solely responsible for the safekeeping of the equipment.', fr: 'Le locataire est seul responsable de la garde du matériel.' },
              { n: '3', alert: false, es: 'En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro de reparación o reposición.', en: 'In case of theft, loss or damage, the renter shall pay the full cost.', fr: 'En cas de vol, perte ou dommage, le locataire paiera le coût total.' },
              { n: '4', alert: true,  es: 'En caso de robo, el arrendatario deberá presentar denuncia policial en 24h y entregar copia al arrendador.', en: 'In case of theft, the renter must file a police report within 24h.', fr: 'En cas de vol, dépôt de plainte obligatoire dans les 24h.' },
              { n: '5', alert: false, es: 'La fianza quedará retenida hasta la devolución del material en el mismo estado.', en: 'The deposit will be held until equipment is returned in the same condition.', fr: "La caution sera conservée jusqu'à la restitution dans le même état." },
              { n: '6', alert: false, es: 'El retraso generará cargos adicionales por cada hora o día de retraso.', en: 'Late returns will incur additional charges per hour or day.', fr: 'Tout retard entraînera des frais supplémentaires.' },
              { n: '7', alert: false, es: 'Este contrato tiene plena validez probatoria ante cualquier instancia judicial o administrativa.', en: 'This contract has full evidentiary value before any authority.', fr: 'Ce contrat a pleine valeur probatoire devant toute instance.' },
              { n: '8', alert: false, es: 'Datos personales tratados conforme al RGPD (UE 2016/679).', en: 'Personal data processed under GDPR (EU 2016/679).', fr: 'Données personnelles traitées conformément au RGPD.' },
            ].map(clause => (
              <div key={clause.n} className="clause-row">
                <div className={`clause-num${clause.alert ? ' alert' : ''}`}>{clause.n}</div>
                <p className="clause-text">
                  <strong style={{ color: clause.alert ? '#DC2626' : '#1E293B', fontWeight: clause.alert ? 700 : 500 }}>{clause.es}</strong>
                  {' '}<em>/ {clause.en}</em>
                  {' '}<em style={{ color: '#CBD5E1' }}>/ {clause.fr}</em>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════
            SIGNATURES
        ══════════════════════════════════ */}
        <div style={{ background: '#FAFBFF', borderTop: '1px solid #F1F5F9', padding: '28px 32px 32px' }}>
          <p className="sec-title" style={{ marginBottom: 20 }}>Firmas y conformidad · Signatures · Acknowledgment</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

            {/* Client opening */}
            <div>
              <p className="s-label" style={{ marginBottom: 8, textAlign: 'center' }}>
                Firma cliente — salida<br/>
                <span style={{ fontSize: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#CBD5E1' }}>Signature client départ</span>
              </p>
              <div style={{
                height: 88, borderRadius: 8, overflow: 'hidden',
                border: rental.openingSignature ? '1px solid #E2E8F0' : '1.5px dashed #E2E8F0',
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {rental.openingSignature
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={rental.openingSignature} alt="Firma" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: 6 }} />
                  : <span style={{ fontSize: 10, color: '#E2E8F0' }}>—</span>
                }
              </div>
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1.5px solid #CBD5E1' }}>
                <p style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>
                  Fecha / Date : {fmtShort(rental.startAt)}
                </p>
              </div>
            </div>

            {/* Client closing */}
            <div>
              <p className="s-label" style={{ marginBottom: 8, textAlign: 'center' }}>
                Firma cliente — retorno<br/>
                <span style={{ fontSize: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#CBD5E1' }}>Signature client retour</span>
              </p>
              <div style={{
                height: 88, borderRadius: 8, overflow: 'hidden',
                border: rental.closingSignature ? '1px solid #E2E8F0' : '1.5px dashed #E2E8F0',
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {rental.closingSignature
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={rental.closingSignature} alt="Firma retorno" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: 6 }} />
                  : <span style={{ fontSize: 10, color: '#E2E8F0' }}>À la restitution</span>
                }
              </div>
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1.5px solid #CBD5E1' }}>
                <p style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>
                  Fecha / Date : {rental.endAt ? fmtShort(rental.endAt) : '___/___/______'}
                </p>
              </div>
            </div>

            {/* Staff */}
            <div>
              <p className="s-label" style={{ marginBottom: 8, textAlign: 'center' }}>
                Firma responsable<br/>
                <span style={{ fontSize: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#CBD5E1' }}>Signature responsable</span>
              </p>
              <div style={{
                height: 88, borderRadius: 8, overflow: 'hidden',
                border: rental.staffSignature ? '1px solid #C7D2FE' : '1.5px dashed #E2E8F0',
                background: rental.staffSignature ? 'white' : '#FAFBFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {rental.staffSignature
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={rental.staffSignature} alt="Firma staff" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: 6 }} />
                  : <span style={{ fontSize: 10, color: '#E2E8F0' }}>—</span>
                }
              </div>
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1.5px solid #6366F1', opacity: 0.4 }}>
                <p style={{ fontSize: 9, color: '#6366F1', textAlign: 'center', fontWeight: 700 }}>
                  {rental.tenant.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            FOOTER
        ══════════════════════════════════ */}
        <div style={{ background: '#0F172A', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#334155' }}>
            {rental.tenant.name} · Generado por VeloRent
          </span>
          <span className="s-mono" style={{ fontSize: 9, color: '#334155' }}>
            {contractNumber} · {generatedAt}
          </span>
        </div>

      </div>
    </>
  )
}
