import { requireSession } from '@/lib/session'
import Sidebar from './_components/Sidebar'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()

  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar tenant={tenant} tenantSlug={session.tenantSlug} role={session.role} />
      {/* Desktop: offset sidebar. Mobile: offset top bar + bottom nav */}
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 mb-16 md:mb-0 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
