import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Clock, AlertTriangle, ChevronRight, Bike } from 'lucide-react'
import { getServerT } from '@/lib/server-t'

export default async function StaffPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const t = await getServerT('staff')
  const tNav = await getServerT('nav')

  const activeRentals = await prisma.rental.findMany({
    where: { tenantId: session.tenantId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    include: { bike: true, customer: true },
    orderBy: { startAt: 'asc' },
  })

  const now = new Date()

  const fmtDuration = (startAt: Date) => {
    const diff = Math.floor((now.getTime() - new Date(startAt).getTime()) / 60000)
    if (diff < 60) return `${diff} min`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
  }

  const fmtTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const overdue = activeRentals.filter(r => r.status === 'OVERDUE')
  const active = activeRentals.filter(r => r.status === 'ACTIVE')

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '0' }}>

      {/* Header */}
      <div style={{ background: '#0F172A', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366F1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={16} color="white" />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{t('title')}</p>
              <p style={{ color: '#475569', fontSize: 12 }}>{activeRentals.length} {activeRentals.length !== 1 ? t('activeRentalsPlural') : t('activeRentals')}</p>
            </div>
          </div>
          <Link
            href={`/${tenant}/dashboard`}
            style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}
          >
            {t('dashboard')}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Bouton Nouvelle location — GROS, impossible à rater */}
        <Link
          href={`/${tenant}/rentals/new`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'linear-gradient(135deg,#6366F1 0%,#8b5cf6 100%)',
            color: 'white', borderRadius: 16, padding: '20px 24px',
            textDecoration: 'none', marginBottom: 24,
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} color="white" />
          </div>
          {t('newRental')}
        </Link>

        {/* Alertes retard */}
        {overdue.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444' }}>
                {t('overdue')} ({overdue.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdue.map(r => (
                <Link
                  key={r.id}
                  href={`/${tenant}/rentals/${r.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 12,
                    padding: '14px 16px', textDecoration: 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#7f1d1d', marginBottom: 2 }}>
                      {r.customer.firstName} {r.customer.lastName}
                    </p>
                    <p style={{ fontSize: 13, color: '#991b1b' }}>
                      {r.bike.name} · {r.bike.code}
                    </p>
                    <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                      Sorti à {fmtTime(r.startAt)} · {fmtDuration(r.startAt)} de retard
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                      {Number(r.amountPaid ?? 0).toFixed(0)} €
                    </span>
                    <ChevronRight size={16} color="#dc2626" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Locations actives */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Clock size={14} color="#6366F1" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366F1' }}>
              {t('inProgress')} ({active.length})
            </span>
          </div>

          {active.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <Bike size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('noActive')}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map(r => {
              const isLate = r.expectedReturnAt && new Date(r.expectedReturnAt) < now
              return (
                <Link
                  key={r.id}
                  href={`/${tenant}/rentals/${r.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
                    padding: '14px 16px', textDecoration: 'none',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                  }}
                >
                  {/* Avatar initiales */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366F1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: 'white',
                    }}>
                      {r.customer.firstName[0]}{r.customer.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 1 }}>
                        {r.customer.firstName} {r.customer.lastName}
                      </p>
                      <p style={{ fontSize: 13, color: '#64748b' }}>
                        {r.bike.name}
                        {r.bike.code && <span style={{ color: '#94a3b8' }}> · {r.bike.code}</span>}
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {t('exitAt')} {fmtTime(r.startAt)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6366F1' }}>
                          {fmtDuration(r.startAt)}
                        </span>
                        {r.expectedReturnAt && (
                          <span style={{ fontSize: 12, color: isLate ? '#ef4444' : '#94a3b8' }}>
                            · {t('returnAt')} {fmtTime(r.expectedReturnAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        {Number(r.amountPaid ?? 0).toFixed(0)} €
                      </p>
                      {Number(r.depositAmount) > 0 && (
                        <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                          F: {Number(r.depositAmount).toFixed(0)} €
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
