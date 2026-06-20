import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import Sidebar from './_components/Sidebar'
import PageTransition from './_components/PageTransition'
import AIAssistant from './_components/AIAssistant'

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
  const h = await headers()

  // Routes publiques (ex: /[tenant]/book) — le proxy retourne NextResponse.next()
  // sans injecter x-tenant-id, donc on rend les children directement sans sidebar
  if (!h.get('x-tenant-id')) {
    return <>{children}</>
  }

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
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 mb-24 md:mb-0 p-4 md:p-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <AIAssistant />
      {/* Mobile FAB — New Rental */}
      <Link
        href={`/${tenant}/rentals/new`}
        className="md:hidden fixed z-30 flex items-center justify-center"
        style={{
          bottom: 'calc(64px + max(12px, env(safe-area-inset-bottom)))',
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
          color: '#fff',
        }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
