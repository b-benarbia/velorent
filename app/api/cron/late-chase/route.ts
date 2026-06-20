/**
 * Auto-relance retardataires — tourne toutes les 30 min (Vercel Cron)
 *
 * Logique d'escalade :
 *   - 0 relances envoyées + retard > 30 min  → 1ère relance (ton amical)
 *   - 1 relance envoyée + il y a > 1h30      → 2ème relance (ton urgent)
 *   - 2 relances envoyées + il y a > 2h      → 3ème relance (ton critique, inclut le N° du shop)
 *
 * La langue du message est détectée automatiquement depuis le téléphone / nationalité du client.
 * Si inconnu → langue du shop (notifLocale).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppVoice, isWhatsAppConfigured } from '@/lib/whatsapp'
import { detectLocale } from '@/lib/detectLanguage'
import { buildVoiceChaseUrl } from '@/app/api/ai/voice-chase/route'

// ── Messages de relance par langue et par niveau ──────────────────────────────

type ChaseLevel = 1 | 2 | 3

interface ChaseTemplate {
  level: ChaseLevel
  getMessage: (opts: {
    firstName: string
    bikeName: string
    shopName: string
    shopPhone: string | null
    overdueMin: number
  }) => string
}

const CHASE_TEMPLATES: Record<string, ChaseTemplate[]> = {
  fr: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Bonjour ${firstName} ! Votre location du ${bikeName} était prévue pour ${overdueMin} min. Tout va bien ? Merci de le ramener dès que possible ou de nous contacter.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, votre vélo (${bikeName}) est en retard de ${Math.round(overdueMin / 60)}h.Merci de nous contacter immédiatement ou de ramener le vélo. Des frais de retard s'appliquent.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `URGENT — ${firstName}, le ${bikeName} loué chez ${shopName} est significativement en retard. Appelez-nous immédiatement${shopPhone ? ` au ${shopPhone}` : ''}. Sans réponse nous serons contraints de signaler la disparition du vélo.`,
    },
  ],
  es: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Hola ${firstName} Tu alquiler de ${bikeName} venció hace ${overdueMin} min. ¿Todo bien? Por favor devuelve la bici cuando puedas o contáctanos.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, tu bici (${bikeName}) lleva ${Math.round(overdueMin / 60)}h de retraso.Contáctanos inmediatamente o devuelve la bicicleta. Se aplicarán cargos por retraso.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `URGENTE — ${firstName}, la ${bikeName} alquilada en ${shopName} lleva un retraso significativo. Llámanos inmediatamente${shopPhone ? ` al ${shopPhone}` : ''}. Sin respuesta tendremos que reportar la desaparición de la bicicleta.`,
    },
  ],
  en: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Hi ${firstName} Your ${bikeName} rental was due ${overdueMin} minutes ago. Is everything OK? Please return it when you can or contact us.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, your bike (${bikeName}) is ${Math.round(overdueMin / 60)}h overdue.Please contact us immediately or return the bike. Late fees are being applied.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `URGENT — ${firstName}, the ${bikeName} rented from ${shopName} is significantly overdue. Please call us immediately${shopPhone ? ` at ${shopPhone}` : ''}. Without a response we may have to report the bike as missing.`,
    },
  ],
  de: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Hallo ${firstName} Ihre ${bikeName}-Miete war vor ${overdueMin} Min. fällig. Alles in Ordnung? Bitte geben Sie das Rad so bald wie möglich zurück oder kontaktieren Sie uns.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, Ihr Rad (${bikeName}) ist ${Math.round(overdueMin / 60)}h überfällig.Bitte kontaktieren Sie uns sofort oder geben Sie das Rad zurück. Verspätungsgebühren werden berechnet.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `DRINGEND — ${firstName}, das ${bikeName} von ${shopName} ist erheblich überfällig. Rufen Sie uns sofort an${shopPhone ? ` unter ${shopPhone}` : ''}. Ohne Rückmeldung müssen wir das Fahrrad als vermisst melden.`,
    },
  ],
  it: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Ciao ${firstName} Il noleggio di ${bikeName} era previsto per ${overdueMin} min fa. Va tutto bene? Per favore restituiscilo appena puoi o contattaci.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, la tua bici (${bikeName}) è in ritardo di ${Math.round(overdueMin / 60)}h.Contattaci immediatamente o restituisci la bici. Verranno applicati costi per il ritardo.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `URGENTE — ${firstName}, la ${bikeName} noleggiata da ${shopName} è significativamente in ritardo. Chiamaci immediatamente${shopPhone ? ` al ${shopPhone}` : ''}. Senza risposta dovremo segnalare la bicicletta come scomparsa.`,
    },
  ],
  nl: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Hallo ${firstName} Je huur van ${bikeName} was ${overdueMin} min geleden afgelopen. Alles goed? Breng hem zo snel mogelijk terug of neem contact op.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, je fiets (${bikeName}) is ${Math.round(overdueMin / 60)}u te laat.Neem onmiddellijk contact op of lever de fiets in. Er worden te late vergoedingen berekend.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `DRINGEND — ${firstName}, de ${bikeName} gehuurd bij ${shopName} is aanzienlijk te laat. Bel ons onmiddellijk${shopPhone ? ` op ${shopPhone}` : ''}. Zonder reactie moeten we de fiets als vermist opgeven.`,
    },
  ],
  pt: [
    {
      level: 1,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `Olá ${firstName} O aluguel de ${bikeName} venceu há ${overdueMin} min. Tudo bem? Por favor devolva quando puder ou entre em contato conosco.`,
    },
    {
      level: 2,
      getMessage: ({ firstName, bikeName, overdueMin }) =>
        `${firstName}, a sua bici (${bikeName}) está ${Math.round(overdueMin / 60)}h atrasada.Entre em contacto imediatamente ou devolva a bicicleta. Taxas de atraso estão sendo aplicadas.`,
    },
    {
      level: 3,
      getMessage: ({ firstName, bikeName, shopName, shopPhone }) =>
        `URGENTE — ${firstName}, a ${bikeName} alugada em ${shopName} está significativamente atrasada. Ligue imediatamente${shopPhone ? ` para ${shopPhone}` : ''}. Sem resposta teremos que reportar a bicicleta como desaparecida.`,
    },
  ],
}

function getTemplate(locale: string, level: ChaseLevel): ChaseTemplate {
  const templates = CHASE_TEMPLATES[locale] ?? CHASE_TEMPLATES['en']
  return templates.find(t => t.level === level) ?? templates[0]
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // URL de base de l'app (pour construire les URLs audio accessibles par Twilio)
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp non configuré' }, { status: 500 })
  }

  const now = new Date()
  const thirtyMinAgo  = new Date(now.getTime() - 30  * 60 * 1000)
  const ninetyMinAgo  = new Date(now.getTime() - 90  * 60 * 1000)
  const twoHoursAgo   = new Date(now.getTime() - 120 * 60 * 1000)

  // Locations en retard avec téléphone client
  const overdueRentals = await prisma.rental.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturnAt: { lt: thirtyMinAgo }, // au moins 30min de retard
      customer: { phone: { not: null } },      // client avec téléphone
    },
    include: {
      customer: true,
      tenant: { select: { name: true, phone: true, notifLocale: true } },
      bikes: { include: { bike: true }, take: 1 },
      bike: true,
    },
  })

  const chased: string[] = []
  const skipped: string[] = []

  for (const rental of overdueRentals) {
    const customer = rental.customer
    if (!customer.phone) continue

    const overdueMin = Math.round((now.getTime() - new Date(rental.expectedReturnAt!).getTime()) / 60000)
    const currentCount = rental.chaseCount ?? 0
    const lastChaseAt = rental.lastChaseAt

    // Décider si on envoie et à quel niveau
    let level: ChaseLevel | null = null

    if (currentCount === 0) {
      level = 1 // Première relance
    } else if (currentCount === 1 && lastChaseAt && lastChaseAt < ninetyMinAgo) {
      level = 2 // Deuxième relance après 1h30
    } else if (currentCount === 2 && lastChaseAt && lastChaseAt < twoHoursAgo) {
      level = 3 // Troisième relance après 2h de plus
    }

    if (!level) {
      skipped.push(rental.id)
      continue
    }

    // Détecter la langue du client
    const clientLocale = detectLocale({
      phone: customer.phone,
      nationality: customer.nationality,
      fallback: rental.tenant.notifLocale ?? 'es',
    })

    // Nom du vélo
    const bike = rental.bikes?.[0]?.bike ?? rental.bike
    const bikeName = bike?.name ?? 'vélo'

    const template = getTemplate(clientLocale, level)
    const message = template.getMessage({
      firstName: customer.firstName,
      bikeName,
      shopName: rental.tenant.name,
      shopPhone: rental.tenant.phone,
      overdueMin,
    })

    // Construire l'URL audio signée — Twilio va la fetcher pour envoyer la note vocale
    const voiceUrl = buildVoiceChaseUrl(baseUrl, message, clientLocale)
    const sent = await sendWhatsAppVoice(customer.phone, voiceUrl, message)

    if (sent) {
      await prisma.rental.update({
        where: { id: rental.id },
        data: { chaseCount: currentCount + 1, lastChaseAt: now },
      })
      chased.push(`${customer.firstName} ${customer.lastName} (niveau ${level})`)
    }
  }

  return NextResponse.json({
    processed: overdueRentals.length,
    chased: chased.length,
    skipped: skipped.length,
    details: chased,
  })
}
