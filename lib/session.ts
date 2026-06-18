import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export interface ServerSession {
  userId: string
  tenantId: string
  tenantSlug: string
  role: 'OWNER' | 'STAFF'
}

export async function requireSession(): Promise<ServerSession> {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const tenantSlug = h.get('x-tenant-slug')
  const userId = h.get('x-user-id')
  const role = h.get('x-user-role') as 'OWNER' | 'STAFF'

  if (!tenantId || !userId) {
    redirect('/login')
  }

  return { tenantId, tenantSlug: tenantSlug!, userId, role }
}
