// GET  /api/settings/dynamic-pricing  → lit la config du tenant connecté
// POST /api/settings/dynamic-pricing  → sauvegarde la config
import { NextRequest, NextResponse }                    from 'next/server'
import { getSession }                                   from '@/lib/auth'
import { prisma }                                       from '@/lib/prisma'
import { DynamicPricingConfig, DEFAULT_CONFIG }         from '@/lib/dynamicPricingConfig'

export type { DynamicPricingConfig }
export { DEFAULT_CONFIG }

export async function GET(req: NextRequest) {
  const session = await getSession()
  const tenantId = session?.tenantId
  if (!tenantId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rows = await prisma.$queryRaw<Array<{ dynamicPricingConfig: unknown }>>`
    SELECT "dynamicPricingConfig" FROM tenants WHERE id = ${tenantId}
  `
  const raw = rows[0]?.dynamicPricingConfig
  const config: DynamicPricingConfig = raw
    ? { ...DEFAULT_CONFIG, ...(raw as object) }
    : DEFAULT_CONFIG

  return NextResponse.json({ config })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  const tenantId = session?.tenantId
  if (!tenantId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const config: DynamicPricingConfig = { ...DEFAULT_CONFIG, ...body }

  await prisma.$executeRaw`
    UPDATE tenants
    SET    "dynamicPricingConfig" = ${JSON.stringify(config)}::jsonb
    WHERE  id = ${tenantId}
  `

  return NextResponse.json({ ok: true, config })
}
