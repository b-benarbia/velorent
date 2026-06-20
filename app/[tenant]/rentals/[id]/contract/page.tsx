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

  const PAY: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta / Carte', BIZUM: 'Bizum',
    TRANSFER: 'Transferencia', ONLINE: 'Online', HOTEL: 'Hotel',
  }
  const DOC: Record<string, string> = {
    PASSPORT: 'Pasaporte', DNI: 'DNI', NIE: 'NIE',
    ID_CARD: 'Documento identidad', DRIVING_LICENSE: 'Permiso conducir', OTHER: 'Otro',
  }
  const BIKE_TYPE: Record<string, string> = {
    CITY: 'City', MTB: 'MTB', ROAD: 'Route', ELECTRIC: 'Électrique',
    CARGO: 'Cargo', KIDS: 'Enfant', OTHER: 'Autre',
  }

  const num = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const isCompleted = rental.status === 'COMPLETED'
  const depositMethod = (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod

  const fmtFull = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtShort = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Toolbar */}
      <div className="no-print flex gap-3 mb-8 px-4 pt-4">
        <PrintButton />
        <a
          href={`/api/rentals/${id}/contract-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display:'flex',alignItems:'center',gap:6,background:'#0F172A',color:'white',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none' }}
        >⬇ PDF</a>
        <Link
          href={`/${tenant}/rentals`}
          style={{ display:'flex',alignItems:'center',gap:6,background:'white',border:'1px solid #E2E8F0',color:'#64748B',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,textDecoration:'none' }}
        >← {tRentals('backToList')}</Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, header, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          body { margin: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        @page { margin: 1cm 1.5cm; size: A4; }

        .doc {
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          max-width: 700px;
          margin: 0 auto 48px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15,23,42,0.07), 0 16px 48px rgba(15,23,42,0.06);
        }

        .lbl {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94A3B8;
          margin-bottom: 4px;
        }
        .val {
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
        }
        .mono { font-family: 'Courier New', monospace; letter-spacing: 0.03em; }

        .row { display: flex; gap: 24px; }
        .cell { display: flex; flex-direction: column; flex: 1; }

        .sep { height: 1px; background: #F1F5F9; }

        .clause {
          display: flex;
          gap: 10px;
          padding: 7px 0;
          border-bottom: 1px solid #F8FAFC;
          align-items: flex-start;
          font-size: 11px;
          color: #374151;
          line-height: 1.6;
        }
        .clause:last-child { border-bottom: none; }
        .cnum {
          min-width: 18px; height: 18px; border-radius: 50%;
          background: #F1F5F9; color: #64748B;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; font-weight: 800; flex-shrink: 0; margin-top: 2px;
        }
        .cnum.red { background: #FEE2E2; color: #DC2626; }
        .clause-tr { color: #CBD5E1; font-size: 10px; font-style: italic; }
      `}</style>

      <div className="doc">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', padding: '20px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            {/* Boutique */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/>
                  <path d="M8 17.5h7M15 6l2.5 4h-8l1-4z"/><path d="M12 6V3.5"/><path d="M17.5 10.5L19 17.5"/>
                </svg>
              </div>
              <div>
                <p style={{ color: 'white', fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>{rental.tenant.name}</p>
                {rental.tenant.phone && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 3 }}>{rental.tenant.phone}</p>}
              </div>
            </div>

            {/* Contrat ref */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Contrat de location</p>
              <p className="mono" style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '0.06em' }}>{num}</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{generatedAt}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 20,
                  background: isCompleted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'white',
                }}>
                  {isCompleted ? '✓ CLÔTURÉ' : '● ACTIF'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DATE STRIP ──────────────────────────────────── */}
        <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 28px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginRight: 8 }}>Départ</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{fmtFull(rental.startAt)}</span>
            <span style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>{fmtTime(rental.startAt)}</span>
          </div>
          {rental.expectedReturnAt && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', marginRight: 8 }}>Retour prévu</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{fmtFull(rental.expectedReturnAt)}</span>
              <span style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>{fmtTime(rental.expectedReturnAt)}</span>
            </div>
          )}
          {rental.endAt && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#16A34A', textTransform: 'uppercase', marginRight: 8 }}>Retour effectif</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', textTransform: 'capitalize' }}>{fmtFull(rental.endAt)}</span>
              <span style={{ fontSize: 12, color: '#4ADE80', marginLeft: 6 }}>{fmtTime(rental.endAt)}</span>
            </div>
          )}
        </div>

        {/* ── CLIENT + PAIEMENT ───────────────────────────── */}
        <div style={{ padding: '22px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

          {/* Client */}
          <div>
            <p className="lbl" style={{ marginBottom: 14 }}>Client / Locataire</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 10, lineHeight: 1.2 }}>
              {rental.customer.firstName} {rental.customer.lastName}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rental.customer.nationality && (
                <div><span className="lbl">Nationalité · </span><span className="val" style={{ fontSize: 13 }}>{rental.customer.nationality}</span></div>
              )}
              {rental.customer.phone && (
                <div><span className="lbl">Tél. · </span><span className="val mono" style={{ fontSize: 13 }}>{rental.customer.phone}</span></div>
              )}
              {rental.customer.email && (
                <div><span className="lbl">Email · </span><span className="val" style={{ fontSize: 12 }}>{rental.customer.email}</span></div>
              )}
              {rental.customer.documentNumber && (
                <div style={{ marginTop: 4, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                  <p className="lbl" style={{ marginBottom: 4 }}>{DOC[rental.customer.documentType ?? ''] ?? 'Document'}</p>
                  <p className="mono" style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '0.06em' }}>
                    {rental.customer.documentNumber}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Paiement */}
          <div>
            <p className="lbl" style={{ marginBottom: 14 }}>Paiement</p>

            {/* Montant */}
            <div style={{ background: '#F0F4FF', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <p className="lbl" style={{ marginBottom: 4 }}>Montant réglé</p>
              <p className="mono" style={{ fontSize: 30, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {Number(rental.amountPaid ?? 0).toFixed(2)}<span style={{ fontSize: 18 }}> €</span>
              </p>
              <p style={{ fontSize: 11, color: '#6366F1', marginTop: 4, fontWeight: 600 }}>{PAY[rental.paymentMethod] ?? rental.paymentMethod}</p>
            </div>

            {/* Caution */}
            {Number(rental.depositAmount) > 0 && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                <p className="lbl" style={{ marginBottom: 4 }}>Caution / Fianza</p>
                <p className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  {Number(rental.depositAmount).toFixed(2)} €
                </p>
                <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  {depositMethod === 'CARD' ? 'Carte bancaire' : 'Espèces'} · Remboursable
                </p>
              </div>
            )}

            {rental.lockNumber && (
              <div style={{ marginTop: 10 }}>
                <p className="lbl">Cadenas N°</p>
                <p className="val mono">{rental.lockNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Photo ID */}
        {rental.customer.documentPhotoUrl && (
          <>
            <div className="sep" />
            <div style={{ padding: '16px 28px' }}>
              <p className="lbl" style={{ marginBottom: 10 }}>Pièce d&apos;identité</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rental.customer.documentPhotoUrl} alt="ID" style={{ maxHeight: 140, borderRadius: 6, border: '1px solid #E2E8F0', objectFit: 'contain' }} />
            </div>
          </>
        )}

        {/* ── VÉHICULE ────────────────────────────────────── */}
        <div className="sep" />
        <div style={{ padding: '18px 28px' }}>
          <p className="lbl" style={{ marginBottom: 12 }}>Véhicule loué / Vehículo alquilado</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>{rental.bike.name}</p>
              {rental.bike.type && (
                <span style={{ display: 'inline-block', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {BIKE_TYPE[rental.bike.type] ?? rental.bike.type}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <p className="lbl">Code</p>
                <p className="val mono" style={{ fontSize: 16, color: '#6366F1' }}>{rental.bike.code}</p>
              </div>
              {rental.bike.serialNumber && (
                <div style={{ borderLeft: '3px solid #DC2626', paddingLeft: 10 }}>
                  <p className="lbl" style={{ color: '#DC2626' }}>N° Série · CRITIQUE</p>
                  <p className="val mono" style={{ fontSize: 16 }}>{rental.bike.serialNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Accessories */}
          {Array.isArray(rental.accessories) && (rental.accessories as unknown[]).length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="lbl" style={{ marginBottom: 0, marginRight: 4 }}>Accessoires ·</span>
              {(rental.accessories as { label: string; qty?: number; codes?: string[] }[]).map((a, i) => (
                <span key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 9px', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                  {a.qty && a.qty > 1 ? `${a.qty}× ` : ''}{a.label}
                  {(a.codes ?? []).filter(Boolean).map(c => (
                    <span key={c} className="mono" style={{ color: '#6366F1', marginLeft: 4, fontSize: 11 }}>#{c}</span>
                  ))}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── CONDITIONS ──────────────────────────────────── */}
        <div className="sep" />
        <div style={{ padding: '18px 28px' }}>
          <p className="lbl" style={{ marginBottom: 12 }}>Conditions générales</p>
          <div>
            {[
              { n:'1', red:false, fr:'Le locataire déclare avoir reçu le matériel en parfait état.', es:'El arrendatario declara haber recibido el material en perfectas condiciones.' },
              { n:'2', red:false, fr:'Le locataire est seul responsable de la garde du matériel pendant toute la durée de la location.', es:'El arrendatario es el único responsable de la custodia durante el alquiler.' },
              { n:'3', red:false, fr:'En cas de vol, perte ou dommage, le locataire paiera le coût total de réparation ou remplacement.', es:'En caso de robo, pérdida o daño, el arrendatario abonará el coste íntegro.' },
              { n:'4', red:true,  fr:'En cas de vol, dépôt de plainte obligatoire sous 24h — copie à remettre impérativement au loueur.', es:'En caso de robo, denuncia policial obligatoria en 24h y entrega de copia al arrendador.' },
              { n:'5', red:false, fr:'La caution est retenue jusqu\'à la restitution du matériel dans le même état.', es:'La fianza queda retenida hasta la devolución del material en el mismo estado.' },
              { n:'6', red:false, fr:'Tout retard entraîne des frais supplémentaires par heure ou jour.', es:'El retraso generará cargos adicionales por hora o día.' },
              { n:'7', red:false, fr:'Ce contrat a pleine valeur probatoire devant toute instance judiciaire ou administrative.', es:'Este contrato tiene plena validez probatoria ante cualquier instancia.' },
              { n:'8', red:false, fr:'Données personnelles traitées conformément au RGPD (UE 2016/679).', es:'Datos personales tratados conforme al RGPD (UE 2016/679).' },
            ].map(c => (
              <div key={c.n} className="clause">
                <div className={`cnum${c.red ? ' red' : ''}`}>{c.n}</div>
                <div>
                  <span style={{ fontWeight: c.red ? 700 : 400, color: c.red ? '#DC2626' : '#1E293B' }}>{c.fr}</span>
                  <span className="clause-tr"> / {c.es}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SIGNATURES ──────────────────────────────────── */}
        <div style={{ background: '#FAFBFF', borderTop: '1px solid #E2E8F0', padding: '20px 28px' }}>
          <p className="lbl" style={{ marginBottom: 16 }}>Signatures</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {[
              { label: 'Client — Départ', sub: fmtShort(rental.startAt), img: rental.openingSignature, accent: '#6366F1' },
              { label: 'Client — Retour', sub: rental.endAt ? fmtShort(rental.endAt) : '— / — / ——', img: rental.closingSignature, accent: '#64748B' },
              { label: 'Responsable', sub: rental.tenant.name, img: rental.staffSignature, accent: '#6366F1' },
            ].map((sig, i) => (
              <div key={i}>
                <p className="lbl" style={{ marginBottom: 6, textAlign: 'center' }}>{sig.label}</p>
                <div style={{
                  height: 80, borderRadius: 8, overflow: 'hidden',
                  border: sig.img ? `1.5px solid ${sig.accent}22` : '1.5px dashed #E2E8F0',
                  background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sig.img
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={sig.img} alt="" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: 6 }} />
                    : <span style={{ fontSize: 10, color: '#E2E8F0' }}>—</span>
                  }
                </div>
                <div style={{ marginTop: 7, paddingTop: 6, borderTop: `2px solid ${sig.img ? sig.accent : '#E2E8F0'}`, opacity: sig.img ? 1 : 0.4 }}>
                  <p style={{ fontSize: 9, textAlign: 'center', color: sig.img ? sig.accent : '#94A3B8', fontWeight: 700 }}>{sig.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #E2E8F0', padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>{rental.tenant.name} · Généré par VeloRent</span>
          <span className="mono" style={{ fontSize: 10, color: '#CBD5E1' }}>{num}</span>
        </div>

      </div>
    </>
  )
}
