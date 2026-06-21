/**
 * GET /api/cron/review-request
 * Cron toutes les 15 min — envoie automatiquement la demande d'avis
 * aux clients dont la location s'est terminée il y a 30–45 min,
 * si pas encore envoyée et si le client a un numéro WhatsApp.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp'
import { detectLocale } from '@/lib/detectLanguage'

const REVIEW_MSG: Record<string, (name: string, shop: string, link: string) => string> = {
  fr: (n, s, l) => `🚴 ${n}, merci pour votre location chez *${s}* !\n\nComment s'est passée votre expérience ?\n\nDonnez votre avis en 10 secondes ⭐\n${l}\n\nMerci ! 🙏`,
  en: (n, s, l) => `🚴 ${n}, thanks for renting with *${s}*!\n\nHow was your experience?\n\nRate us in 10 seconds ⭐\n${l}\n\nThank you! 🙏`,
  es: (n, s, l) => `🚴 ${n}, ¡gracias por alquilar con *${s}*!\n\n¿Qué tal tu experiencia?\n\nValóranos en 10 segundos ⭐\n${l}\n\n¡Gracias! 🙏`,
  de: (n, s, l) => `🚴 ${n}, danke bei *${s}*!\n\nWie war Ihre Erfahrung?\n\nBewerten Sie in 10 Sekunden ⭐\n${l}\n\nDanke! 🙏`,
  it: (n, s, l) => `🚴 ${n}, grazie per il noleggio da *${s}*!\n\nCom'è stata l'esperienza?\n\nValutaci in 10 secondi ⭐\n${l}\n\nGrazie! 🙏`,
  nl: (n, s, l) => `🚴 ${n}, bedankt bij *${s}*!\n\nHoe was uw ervaring?\n\nBeoordeel ons in 10 seconden ⭐\n${l}\n\nBedankt! 🙏`,
  pt: (n, s, l) => `🚴 ${n}, obrigado por alugar na *${s}*!\n\nComo foi a experiência?\n\nAvalie-nos em 10 segundos ⭐\n${l}\n\nObrigado! 🙏`,
}

export async function GET(req: Request) {
  // Vérification du secret cron (optionnel mais recommandé)
  const auth = req.headers ? new Headers(req.headers).get('authorization') : null
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - 45 * 60 * 1000) // il y a 45 min
  const windowEnd   = new Date(now.getTime() - 30 * 60 * 1000) // il y a 30 min

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://velorent.app'

  try {
    // Trouver les locations terminées dans la fenêtre 30–45 min, sans avis envoyé
    const candidates = await prisma.$queryRaw<Array<{
      id: string
      customerFirstName: string
      customerPhone: string | null
      shopName: string
      shopSlug: string
      notifLocale: string
      reviewToken: string | null
    }>>`
      SELECT
        r.id,
        c."firstName"  AS "customerFirstName",
        c.phone        AS "customerPhone",
        t.name         AS "shopName",
        t.slug         AS "shopSlug",
        t."notifLocale",
        r."reviewToken"
      FROM rentals r
      JOIN tenants   t ON t.id = r."tenantId"
      JOIN customers c ON c.id = r."customerId"
      WHERE r.status         = 'COMPLETED'
        AND r."endAt"        >= ${windowStart}
        AND r."endAt"        <= ${windowEnd}
        AND r."reviewSentAt" IS NULL
        AND r."reviewScore"  IS NULL
        AND c.phone          IS NOT NULL
      LIMIT 50
    `

    const results: { id: string; status: string; phone?: string }[] = []

    for (const row of candidates) {
      try {
        // Créer le token si pas encore fait
        let token = row.reviewToken
        if (!token) {
          token = crypto.randomUUID()
          await prisma.$executeRaw`
            UPDATE rentals SET "reviewToken" = ${token} WHERE id = ${row.id}
          `
        }

        const link = `${baseUrl}/review/${row.shopSlug}/${token}`
        // Détecter la langue du client via son numéro → fallback langue du shop
        const lang = detectLocale({ phone: row.customerPhone, fallback: 'en' })
        const msg = (REVIEW_MSG[lang] ?? REVIEW_MSG['en'])(row.customerFirstName, row.shopName, link)

        await sendWhatsApp(row.customerPhone!, msg)

        await prisma.$executeRaw`
          UPDATE rentals SET "reviewSentAt" = NOW() WHERE id = ${row.id}
        `

        results.push({ id: row.id, status: 'sent', phone: row.customerPhone! })
      } catch (err) {
        results.push({ id: row.id, status: 'error' })
        console.error(`[cron/review-request] ${row.id}:`, err)
      }
    }

    return NextResponse.json({ checked: candidates.length, sent: results.filter(r => r.status === 'sent').length, results })
  } catch (err) {
    console.error('[cron/review-request]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
