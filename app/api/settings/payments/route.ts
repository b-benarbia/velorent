import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      stripePublishableKey: true,
      // Ne jamais renvoyer la clé secrète en clair — on renvoie juste si elle est configurée
      stripeSecretKey: true,
    },
  })

  return NextResponse.json({
    stripePublishableKey: tenant?.stripePublishableKey ?? '',
    // Masquer la clé secrète : renvoyer uniquement les 8 derniers caractères pour confirmation
    stripeSecretKeyMasked: tenant?.stripeSecretKey
      ? '••••••••' + tenant.stripeSecretKey.slice(-6)
      : '',
    hasStripeSecret: !!tenant?.stripeSecretKey,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { stripePublishableKey, stripeSecretKey } = await req.json()

  // Validation basique des formats Stripe
  if (stripePublishableKey && !stripePublishableKey.startsWith('pk_')) {
    return NextResponse.json({ error: 'Clé publique invalide (doit commencer par pk_)' }, { status: 400 })
  }
  if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
    return NextResponse.json({ error: 'Clé secrète invalide (doit commencer par sk_)' }, { status: 400 })
  }

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      ...(stripePublishableKey !== undefined && { stripePublishableKey }),
      // Ne mettre à jour la clé secrète que si elle est fournie et non masquée
      ...(stripeSecretKey && !stripeSecretKey.startsWith('••') && { stripeSecretKey }),
    },
  })

  return NextResponse.json({ ok: true })
}
