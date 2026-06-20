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

  const [tRentals, t] = await Promise.all([
    getServerT('rentals'),
    getServerT('contract'),
  ])

  const LOCALE_MAP: Record<string, string> = {
    fr: 'fr-FR', es: 'es-ES', en: 'en-GB', de: 'de-DE',
    it: 'it-IT', nl: 'nl-NL', pt: 'pt-PT',
  }
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const rawLocale = cookieStore.get('locale')?.value ?? 'fr'
  const dateLocale = LOCALE_MAP[rawLocale] ?? 'fr-FR'

  const PAY: Record<string, string> = {
    CASH: t('depositCash'), CARD: t('depositCard'), BIZUM: 'Bizum',
    TRANSFER: 'Virement / Transfer', ONLINE: 'Online', HOTEL: 'Hotel',
  }
  const DOC: Record<string, string> = {
    PASSPORT: 'Passport', DNI: 'DNI', NIE: 'NIE',
    ID_CARD: 'ID Card', DRIVING_LICENSE: 'License', OTHER: 'Document',
  }
  const BIKE_TYPE: Record<string, string> = {
    CITY: 'City', MTB: 'MTB', ROAD: 'Road', ELECTRIC: 'Electric',
    CARGO: 'Cargo', KIDS: 'Kids', OTHER: 'Other',
  }

  const num = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt = new Date().toLocaleString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const isCompleted = rental.status === 'COMPLETED'
  const depositMethod = (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod
  const isSigned = !!(rental.openingSignature && rental.staffSignature)

  const fmtFull = (d: Date | string) =>
    new Date(d).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtShort = (d: Date | string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })

  const clauses: { key: string; red: boolean }[] = [
    { key: 'clause1', red: false },
    { key: 'clause2', red: false },
    { key: 'clause3', red: false },
    { key: 'clause4', red: true  },
    { key: 'clause5', red: false },
    { key: 'clause6', red: false },
    { key: 'clause7', red: false },
    { key: 'clause8', red: false },
  ]

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
          max-width: 720px;
          margin: 0 auto 48px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15,23,42,0.06), 0 20px 60px rgba(15,23,42,0.08);
        }
        .lbl {
          font-size: 9px; font-weight: 700; letter-spacing: 0.13em;
          text-transform: uppercase; color: #94A3B8; margin-bottom: 3px;
        }
        .val { font-size: 14px; font-weight: 600; color: #0F172A; }
        .mono { font-family: 'Courier New', monospace; letter-spacing: 0.03em; }
        .sep { height: 1px; background: #F1F5F9; }
      `}</style>

      <div className="doc">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)', padding: '22px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

            {/* Shop identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {rental.tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rental.tenant.logoUrl}
                  alt={rental.tenant.name}
                  style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.3)', background: 'white' }}
                />
              ) : (
                <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/>
                    <path d="M8 17.5h7M15 6l2.5 4h-8l1-4z"/><path d="M12 6V3.5"/><path d="M17.5 10.5L19 17.5"/>
                  </svg>
                </div>
              )}
              <div>
                <p style={{ color: 'white', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>{rental.tenant.name}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                  {rental.tenant.phone && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{rental.tenant.phone}</span>}
                  {rental.tenant.email && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{rental.tenant.email}</span>}
                </div>
              </div>
            </div>

            {/* Contract ref */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block', marginBottom: 8,
                padding: '3px 10px', borderRadius: 20,
                background: isCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(110,231,183,0.25)',
                border: isCompleted ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(110,231,183,0.5)',
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'white',
              }}>
                {isCompleted ? `✓ ${t('closed')}` : `● ${t('active')}`}
              </span>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{t('title')}</p>
              <p className="mono" style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>{generatedAt}</p>
            </div>
          </div>
        </div>

        {/* ── DATE STRIP ──────────────────────────────────── */}
        <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '12px 28px', display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid #E2E8F0' }}>
            <p className="lbl" style={{ marginBottom: 4 }}>{t('departure')}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize', lineHeight: 1.3 }}>
              {fmtFull(rental.startAt)}{' '}
              <span style={{ color: '#64748B', fontWeight: 500 }}>{fmtTime(rental.startAt)}</span>
            </p>
          </div>
          {rental.expectedReturnAt && (
            <div style={{ flex: 1, paddingLeft: 24, paddingRight: rental.endAt ? 24 : 0, borderRight: rental.endAt ? '1px solid #E2E8F0' : undefined }}>
              <p className="lbl" style={{ marginBottom: 4 }}>{t('expectedReturn')}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize', lineHeight: 1.3 }}>
                {fmtFull(rental.expectedReturnAt)}{' '}
                <span style={{ color: '#64748B', fontWeight: 500 }}>{fmtTime(rental.expectedReturnAt)}</span>
              </p>
            </div>
          )}
          {rental.endAt && (
            <div style={{ flex: 1, paddingLeft: 24 }}>
              <p className="lbl" style={{ marginBottom: 4, color: '#16A34A' }}>{t('actualReturn')}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', textTransform: 'capitalize', lineHeight: 1.3 }}>
                {fmtFull(rental.endAt)}{' '}
                <span style={{ fontWeight: 500 }}>{fmtTime(rental.endAt)}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── CLIENT + PAIEMENT ───────────────────────────── */}
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

          {/* Client */}
          <div>
            <p className="lbl" style={{ marginBottom: 12 }}>{t('client')}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 14, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {rental.customer.firstName} {rental.customer.lastName}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rental.customer.nationality && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="lbl" style={{ marginBottom: 0, minWidth: 72, flexShrink: 0 }}>{t('nationality')}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{rental.customer.nationality}</span>
                </div>
              )}
              {rental.customer.phone && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="lbl" style={{ marginBottom: 0, minWidth: 72, flexShrink: 0 }}>{t('phone')}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{rental.customer.phone}</span>
                </div>
              )}
              {rental.customer.email && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="lbl" style={{ marginBottom: 0, minWidth: 72, flexShrink: 0 }}>Email</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{rental.customer.email}</span>
                </div>
              )}
              {rental.customer.documentNumber && (
                <div style={{ marginTop: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px' }}>
                  <p className="lbl" style={{ marginBottom: 5 }}>{DOC[rental.customer.documentType ?? ''] ?? t('document')}</p>
                  <p className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '0.08em' }}>
                    {rental.customer.documentNumber}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Paiement */}
          <div>
            <p className="lbl" style={{ marginBottom: 12 }}>{t('payment')}</p>

            <div style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0F4FF 100%)', borderRadius: 12, padding: '16px 18px', marginBottom: 12, border: '1px solid #E0E7FF' }}>
              <p className="lbl" style={{ marginBottom: 6, color: '#818CF8' }}>{t('amountPaid')}</p>
              <p className="mono" style={{ fontSize: 32, fontWeight: 800, color: '#4338CA', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {Number(rental.amountPaid ?? 0).toFixed(2)}<span style={{ fontSize: 20, fontWeight: 600 }}> €</span>
              </p>
              <p style={{ fontSize: 11, color: '#6366F1', marginTop: 7, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {PAY[rental.paymentMethod] ?? rental.paymentMethod}
              </p>
            </div>

            {Number(rental.depositAmount) > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <p className="lbl" style={{ marginBottom: 5 }}>{t('deposit')}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="mono" style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                    {Number(rental.depositAmount).toFixed(2)} €
                  </p>
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                    {depositMethod === 'CARD' ? t('depositCard') : t('depositCash')} · {t('depositRefundable')}
                  </span>
                </div>
              </div>
            )}

            {rental.lockNumber && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <span className="lbl" style={{ marginBottom: 0 }}>{t('lockNumber')}</span>
                <span className="mono val" style={{ fontSize: 15, color: '#4338CA' }}>{rental.lockNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Photo ID */}
        {rental.customer.documentPhotoUrl && (
          <>
            <div className="sep" />
            <div style={{ padding: '16px 28px' }}>
              <p className="lbl" style={{ marginBottom: 10 }}>{t('document')}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rental.customer.documentPhotoUrl} alt="ID" style={{ maxHeight: 130, borderRadius: 8, border: '1px solid #E2E8F0', objectFit: 'contain' }} />
            </div>
          </>
        )}

        {/* ── VÉHICULE ────────────────────────────────────── */}
        <div className="sep" />
        <div style={{ padding: '20px 28px' }}>
          <p className="lbl" style={{ marginBottom: 14 }}>{t('vehicle')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 5, letterSpacing: '-0.01em' }}>{rental.bike.name}</p>
              {rental.bike.type && (
                <span style={{ display: 'inline-block', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 5, padding: '2px 9px', fontSize: 10, fontWeight: 800, color: '#4338CA', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  {BIKE_TYPE[rental.bike.type] ?? rental.bike.type}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <p className="lbl">{t('vehicleCode')}</p>
                <p className="val mono" style={{ fontSize: 17, color: '#4338CA', letterSpacing: '0.04em' }}>{rental.bike.code}</p>
              </div>
              {rental.bike.serialNumber && (
                <div style={{ borderLeft: '3px solid #DC2626', paddingLeft: 12 }}>
                  <p className="lbl" style={{ color: '#DC2626' }}>{t('serialNumber')} · {t('serialCritical')}</p>
                  <p className="val mono" style={{ fontSize: 17 }}>{rental.bike.serialNumber}</p>
                </div>
              )}
            </div>
          </div>

          {Array.isArray(rental.accessories) && (rental.accessories as unknown[]).length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="lbl" style={{ marginBottom: 0, marginRight: 4 }}>{t('accessories')} ·</span>
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
        <div style={{ padding: '20px 28px' }}>
          <p className="lbl" style={{ marginBottom: 14 }}>{t('conditions')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {clauses.map((c, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 6,
                background: c.red ? '#FFF5F5' : 'transparent',
                borderLeft: `3px solid ${c.red ? '#DC2626' : '#EEF2FF'}`,
              }}>
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 4,
                  background: c.red ? '#FEE2E2' : '#F1F5F9',
                  color: c.red ? '#DC2626' : '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <p style={{
                  fontSize: 11.5,
                  color: c.red ? '#991B1B' : '#374151',
                  fontWeight: c.red ? 700 : 400,
                  lineHeight: 1.75,
                  margin: 0,
                }}>{t(c.key)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SIGNATURES ──────────────────────────────────── */}
        <div style={{ background: '#FAFBFF', borderTop: '1px solid #E8EEFF', padding: '22px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <p className="lbl" style={{ marginBottom: 0 }}>{t('signatures')}</p>
            {isSigned && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#16A34A',
                background: '#F0FDF4', border: '1px solid #86EFAC',
                borderRadius: 20, padding: '3px 12px', letterSpacing: '0.07em',
              }}>
                ✓ {tRentals('signed')}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {([
              { label: t('sigClientDeparture'), sub: fmtShort(rental.startAt), img: rental.openingSignature, accent: '#4338CA' },
              { label: t('sigClientReturn'),    sub: rental.endAt ? fmtShort(rental.endAt) : '—', img: rental.closingSignature, accent: '#64748B' },
              { label: t('sigResponsible'),     sub: rental.tenant.name, img: rental.staffSignature, accent: '#4338CA' },
            ] as { label: string; sub: string; img: string | null; accent: string }[]).map((sig, i) => (
              <div key={i}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: sig.img ? sig.accent : '#CBD5E1', marginBottom: 8, textAlign: 'center',
                }}>{sig.label}</p>
                <div style={{
                  height: 90, borderRadius: 8, overflow: 'hidden',
                  border: sig.img ? `1.5px solid ${sig.accent}33` : '1.5px dashed #E2E8F0',
                  background: sig.img ? `${sig.accent}06` : '#FAFAFA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sig.img
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={sig.img} alt="" style={{ maxHeight: '100%', width: '100%', objectFit: 'contain', padding: 8 }} />
                    : <span style={{ fontSize: 11, color: '#D1D5DB', fontWeight: 500 }}>—</span>
                  }
                </div>
                <div style={{ marginTop: 8, borderTop: `2px solid ${sig.img ? sig.accent : '#E2E8F0'}`, paddingTop: 6 }}>
                  <p style={{
                    fontSize: 9, textAlign: 'center', fontWeight: 700, letterSpacing: '0.04em',
                    color: sig.img ? sig.accent : '#94A3B8',
                  }}>{sig.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
          <span style={{ fontSize: 9.5, color: '#CBD5E1', letterSpacing: '0.03em' }}>{rental.tenant.name} · {t('generatedBy')}</span>
          <span className="mono" style={{ fontSize: 9.5, color: '#CBD5E1' }}>{num}</span>
        </div>

      </div>
    </>
  )
}
