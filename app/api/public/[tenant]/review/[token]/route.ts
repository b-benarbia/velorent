/**
 * GET  /api/public/[tenant]/review/[token]  — charge les infos de la location
 * POST /api/public/[tenant]/review/[token]  — enregistre la note + déclenche logique Google / alerte
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp'

// ── GET — infos de la location pour la page review ────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; token: string }> }
) {
  const { tenant: slug, token } = await params

  // Mode aperçu — données fictives pour tester le rendu sans location réelle
  if (token === 'preview') {
    return NextResponse.json({
      customerName: 'Jean-Paul',
      bikeName: 'VTC Électrique',
      bikeType: 'ELECTRIC',
      startAt: new Date(),
      endAt: new Date(),
      reviewScore: null,
      shopName: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
      shopCity: 'Paris, France',
      googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      currency: 'EUR',
      alreadyReviewed: false,
    })
  }

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string; customerFirstName: string; bikeName: string | null; bikeType: string | null
      startAt: Date; endAt: Date | null; reviewScore: number | null; reviewComment: string | null
      shopName: string; shopCity: string | null; googlePlaceId: string | null; currency: string
    }>>`
      SELECT
        r.id,
        c."firstName"     AS "customerFirstName",
        b.name            AS "bikeName",
        b.type            AS "bikeType",
        r."startAt",
        r."endAt",
        r."reviewScore",
        r."reviewComment",
        t.name            AS "shopName",
        t.address         AS "shopCity",
        t."googlePlaceId",
        t.currency
      FROM rentals r
      JOIN tenants  t ON t.id = r."tenantId"
      JOIN customers c ON c.id = r."customerId"
      LEFT JOIN bikes b ON b.id = r."bikeId"
      WHERE t.slug = ${slug}
        AND r."reviewToken" = ${token}
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    const row = rows[0]
    return NextResponse.json({
      customerName: row.customerFirstName,
      bikeName: row.bikeName,
      bikeType: row.bikeType,
      startAt: row.startAt,
      endAt: row.endAt,
      reviewScore: row.reviewScore,
      shopName: row.shopName,
      shopCity: row.shopCity,
      googlePlaceId: row.googlePlaceId,
      currency: row.currency,
      alreadyReviewed: row.reviewScore !== null,
    })
  } catch (err) {
    console.error('[review:GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST — enregistre la note ──────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; token: string }> }
) {
  const { tenant: slug, token } = await params
  const body = await req.json()

  // Mode aperçu
  if (token === 'preview') {
    const score: number = body.score
    return NextResponse.json({
      ok: true,
      score,
      googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      googleReviewUrl: score >= 4 ? 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4' : null,
    })
  }

  const score: number = body.score          // 1–5
  const comment: string = body.comment ?? ''  // feedback privé si score ≤ 3

  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'Note invalide' }, { status: 400 })
  }

  try {
    // Récupérer la location + infos shop + WhatsApp owner
    const rows = await prisma.$queryRaw<Array<{
      id: string; tenantId: string
      customerFirstName: string; customerLastName: string
      bikeName: string | null
      shopName: string; shopCity: string | null
      notifWhatsapp: string | null; notifLocale: string
      googlePlaceId: string | null
    }>>`
      SELECT
        r.id,
        r."tenantId",
        c."firstName"     AS "customerFirstName",
        c."lastName"      AS "customerLastName",
        b.name            AS "bikeName",
        t.name            AS "shopName",
        t.address         AS "shopCity",
        t."notifWhatsapp",
        t."notifLocale",
        t."googlePlaceId"
      FROM rentals r
      JOIN tenants   t ON t.id = r."tenantId"
      JOIN customers c ON c.id = r."customerId"
      LEFT JOIN bikes b ON b.id = r."bikeId"
      WHERE t.slug = ${slug}
        AND r."reviewToken" = ${token}
        AND r."reviewScore" IS NULL
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Avis déjà envoyé ou lien invalide' }, { status: 409 })
    }

    const row = rows[0]

    // Enregistrer la note
    await prisma.$executeRaw`
      UPDATE rentals
      SET "reviewScore"   = ${score},
          "reviewComment" = ${comment || null}
      WHERE id = ${row.id}
    `

    // Si mauvais avis (≤ 3) → alerte WhatsApp au propriétaire
    if (score <= 3 && row.notifWhatsapp) {
      const stars = '⭐'.repeat(score)
      const msg = [
        `⚠️ *Avis négatif reçu — ${row.shopName}*`,
        '',
        `Client : ${row.customerFirstName} ${row.customerLastName}`,
        `Vélo : ${row.bikeName ?? 'N/A'}`,
        `Note : ${stars} (${score}/5)`,
        comment ? `Commentaire : "${comment}"` : '',
        '',
        `👉 Contacte ce client rapidement pour résoudre le problème.`,
      ].filter(Boolean).join('\n')

      await sendWhatsApp(row.notifWhatsapp, msg).catch(console.error)
    }

    return NextResponse.json({
      ok: true,
      score,
      googlePlaceId: row.googlePlaceId,
      // Si bon avis → renvoie l'URL Google Maps pour ouvrir la page d'avis
      googleReviewUrl: row.googlePlaceId && score >= 4
        ? `https://search.google.com/local/writereview?placeid=${row.googlePlaceId}`
        : null,
    })
  } catch (err) {
    console.error('[review:POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
