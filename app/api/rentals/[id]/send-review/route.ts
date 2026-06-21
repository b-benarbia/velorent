/**
 * POST /api/rentals/[id]/send-review
 * Envoie (ou re-envoie) le lien d'avis WhatsApp au client.
 * Appelé manuellement depuis le dashboard après clôture de location.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp'
import { detectLocale } from '@/lib/detectLanguage'

// Traductions du message WhatsApp (dans la langue détectée du client ou notifLocale)
const REVIEW_MSG: Record<string, (name: string, shop: string, link: string) => string> = {
  fr: (name, shop, link) =>
    `🚴 ${name}, merci pour votre location chez *${shop}* !\n\nComment s'est passée votre expérience ?\n\nDonnez votre avis en 10 secondes ⭐\n${link}\n\nMerci beaucoup ! 🙏`,
  en: (name, shop, link) =>
    `🚴 ${name}, thanks for renting with *${shop}*!\n\nHow was your experience?\n\nShare your rating in 10 seconds ⭐\n${link}\n\nThank you! 🙏`,
  es: (name, shop, link) =>
    `🚴 ${name}, ¡gracias por alquilar con *${shop}*!\n\n¿Qué tal tu experiencia?\n\nDeja tu valoración en 10 segundos ⭐\n${link}\n\n¡Muchas gracias! 🙏`,
  de: (name, shop, link) =>
    `🚴 ${name}, danke für Ihre Ausleihe bei *${shop}*!\n\nWie war Ihre Erfahrung?\n\nBewerten Sie in 10 Sekunden ⭐\n${link}\n\nVielen Dank! 🙏`,
  it: (name, shop, link) =>
    `🚴 ${name}, grazie per aver noleggiato da *${shop}*!\n\nCom'è stata la tua esperienza?\n\nLascia la tua valutazione in 10 secondi ⭐\n${link}\n\nGrazie mille! 🙏`,
  nl: (name, shop, link) =>
    `🚴 ${name}, bedankt voor uw huur bij *${shop}*!\n\nHoe was uw ervaring?\n\nGeef uw beoordeling in 10 seconden ⭐\n${link}\n\nHartelijk bedankt! 🙏`,
  pt: (name, shop, link) =>
    `🚴 ${name}, obrigado por alugar na *${shop}*!\n\nComo foi a sua experiência?\n\nDeixe a sua avaliação em 10 segundos ⭐\n${link}\n\nMuito obrigado! 🙏`,
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const lang: string = body.lang ?? 'en'

  try {
    // Charger la location + client + shop
    const rows = await prisma.$queryRaw<Array<{
      id: string; tenantId: string; status: string
      customerFirstName: string; customerPhone: string | null
      shopName: string; shopSlug: string
      notifLocale: string
      reviewToken: string | null; reviewSentAt: Date | null; reviewScore: number | null
    }>>`
      SELECT
        r.id, r."tenantId", r.status,
        c."firstName"  AS "customerFirstName",
        c.phone        AS "customerPhone",
        t.name         AS "shopName",
        t.slug         AS "shopSlug",
        t."notifLocale",
        r."reviewToken",
        r."reviewSentAt",
        r."reviewScore"
      FROM rentals r
      JOIN tenants   t ON t.id  = r."tenantId"
      JOIN customers c ON c.id  = r."customerId"
      WHERE r.id        = ${id}
        AND r."tenantId" = ${session.tenantId}
      LIMIT 1
    `

    if (!rows.length) return NextResponse.json({ error: 'Location introuvable' }, { status: 404 })
    const row = rows[0]

    if (row.reviewScore !== null) {
      return NextResponse.json({ error: 'Avis déjà reçu' }, { status: 409 })
    }

    if (!row.customerPhone) {
      return NextResponse.json({ error: 'Pas de numéro de téléphone client' }, { status: 400 })
    }

    // Créer ou réutiliser le token
    let token = row.reviewToken
    if (!token) {
      token = crypto.randomUUID()
      await prisma.$executeRaw`
        UPDATE rentals SET "reviewToken" = ${token} WHERE id = ${id}
      `
    }

    // Construire le lien
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://velorent.app'
    const link = `${baseUrl}/review/${row.shopSlug}/${token}`

    // Choisir la langue : override manuel → détection par téléphone → fallback owner
    const msgLang = (lang && REVIEW_MSG[lang])
      ? lang
      : detectLocale({ phone: row.customerPhone, fallback: 'en' })
    const msgFn = REVIEW_MSG[msgLang] ?? REVIEW_MSG['en']
    const msg = msgFn(row.customerFirstName, row.shopName, link)

    await sendWhatsApp(row.customerPhone, msg)

    // Marquer l'envoi
    await prisma.$executeRaw`
      UPDATE rentals SET "reviewSentAt" = NOW() WHERE id = ${id}
    `

    return NextResponse.json({ ok: true, link, sentTo: row.customerPhone })
  } catch (err) {
    console.error('[send-review:POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
