import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from './_components/Sidebar'
import PageTransition from './_components/PageTransition'

// Routes autorisées pour le rôle STAFF
const STAFF_ALLOWED = ['/staff', '/rentals/new', '/rentals/', '/reservations']

function isStaffAllowed(pathname: string, tenant: string): boolean {
  const path = pathname.replace(`/${tenant}`, '')
  return STAFF_ALLOWED.some(allowed => path === allowed || path.startsWith(allowed))
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()

  // Restriction STAFF — redirect si route non autorisée
  if (session.role === 'STAFF') {
    const h = await headers()
    const pathname = h.get('x-pathname') ?? ''
    if (!isStaffAllowed(pathname, tenant)) {
      redirect(`/${tenant}/staff`)
    }

    // Layout minimal pour staff — pas de sidebar
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <PageTransition>{children}</PageTransition>
      </div>
    )
  }

  // Layout complet pour OWNER
  const [activeRentalsCount, pendingReservationsCount] = await Promise.all([
    prisma.rental.count({ where: { tenantId: session.tenantId, status: 'ACTIVE' } }),
    prisma.reservation.count({ where: { tenantId: session.tenantId, status: 'PENDING' } }),
  ])

  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar
        tenant={tenant}
        tenantSlug={session.tenantSlug}
        role={session.role}
        activeRentalsCount={activeRentalsCount}
        pendingReservationsCount={pendingReservationsCount}
      />
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 mb-16 md:mb-0 p-4 md:p-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
