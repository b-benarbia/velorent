/**
 * POST /api/webhooks/whatsapp
 *
 * Reçoit les messages WhatsApp entrants via Twilio.
 * Traitement :
 *   1. Parse le message + numéro client
 *   2. Trouve le shop depuis la DB (via historique client)
 *   3. Détecte la langue du client (préfixe téléphone)
 *   4. Appelle Claude Haiku avec le contexte complet du shop
 *   5. Si demande de réservation → crée la réservation automatiquement
 *   6. Répond au client via TwiML (WhatsApp)
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { detectLocale } from '@/lib/detectLanguage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Nettoyage numéro de téléphone ────────────────────────────────────────────

function cleanPhone(raw: string): string {
  return raw.replace('whatsapp:', '').replace(/\s+/g, '').trim()
}

// ── Trouver le tenant depuis le téléphone client ──────────────────────────────

async function findTenant(phone: string) {
  // 1. Client existant
  const customer = await prisma.customer.findFirst({
    where: { phone: { contains: phone.replace('+', '') } },
    orderBy: { createdAt: 'desc' },
    select: { tenantId: true },
  })
  if (customer) return customer.tenantId

  // 2. Réservation existante
  const reservation = await prisma.reservation.findFirst({
    where: { customerPhone: { contains: phone.replace('+', '') } },
    orderBy: { createdAt: 'desc' },
    select: { tenantId: true },
  })
  if (reservation) return reservation.tenantId

  return null
}

// ── Contexte shop pour l'IA ───────────────────────────────────────────────────

async function buildShopContext(tenantId: string) {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)
  const nextWeek  = new Date(now.getTime() + 7 * 24 * 3600 * 1000)

  const [tenant, availableBikes, activeRentals, upcomingReservations] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true, phone: true, currency: true, pricingGrid: true, depositConfig: true, insuranceConfig: true },
    }),
    prisma.bike.findMany({
      where: { tenantId, status: 'AVAILABLE' },
      select: { name: true, type: true, dailyRate: true, hourlyRate: true },
    }),
    prisma.rental.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.reservation.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: { gte: now, lte: nextWeek },
      },
      select: { startAt: true, endAt: true, bikeType: true },
    }),
  ])

  // Types disponibles avec tarifs
  const bikesSummary = availableBikes.map(b =>
    `${b.name} (${b.type}) — ${b.dailyRate}${tenant?.currency ?? 'EUR'}/jour${b.hourlyRate ? ` · ${b.hourlyRate}${tenant?.currency ?? 'EUR'}/h` : ''}`
  ).join('\n')

  // Créneaux déjà réservés la semaine prochaine
  const bookedSlots = upcomingReservations.map(r =>
    `${new Date(r.startAt).toLocaleDateString('fr-FR')} → ${new Date(r.endAt).toLocaleDateString('fr-FR')} (${r.bikeType ?? 'type non spécifié'})`
  ).join('\n')

  // Grille tarifaire (ex: {"CITY": {"1h": 5, "1d": 15, "3d": 12}, "ELECTRIC": {...}})
  let pricingGridStr = ''
  if (tenant?.pricingGrid && typeof tenant.pricingGrid === 'object' && Object.keys(tenant.pricingGrid).length > 0) {
    pricingGridStr = Object.entries(tenant.pricingGrid as Record<string, Record<string, number>>)
      .map(([type, rates]) => {
        const rateStr = Object.entries(rates)
          .map(([dur, price]) => `${dur}=${price}${tenant?.currency ?? 'EUR'}`)
          .join(', ')
        return `${type}: ${rateStr}`
      })
      .join('\n')
  }

  return {
    tenant,
    context: `
SHOP: ${tenant?.name}
ADRESSE: ${tenant?.address ?? 'non renseignée'}
TÉLÉPHONE SHOP: ${tenant?.phone ?? 'non renseigné'}
DATE/HEURE ACTUELLE: ${now.toLocaleString('fr-FR')}

VÉLOS DISPONIBLES (${availableBikes.length}) :
${bikesSummary || 'Aucun vélo disponible pour le moment'}

${pricingGridStr ? `GRILLE TARIFAIRE (durée → prix) :
${pricingGridStr}

` : ''}LOCATIONS EN COURS: ${activeRentals}

CAUTIONS PAR TYPE :
${tenant?.depositConfig && Object.keys(tenant.depositConfig as object).length > 0
  ? Object.entries(tenant.depositConfig as Record<string, number>).map(([t, v]) => `${t}: ${v}${tenant?.currency ?? 'EUR'}`).join(', ')
  : 'non renseignées'}

ASSURANCE :
${tenant?.insuranceConfig && Object.keys(tenant.insuranceConfig as object).length > 0
  ? Object.entries(tenant.insuranceConfig as Record<string, number>).map(([z, v]) => `${z}: ${v}${tenant?.currency ?? 'EUR'}/jour`).join(', ')
  : 'non renseignée'}

CRÉNEAUX DÉJÀ RÉSERVÉS CETTE SEMAINE:
${bookedSlots || 'Aucun'}
`.trim(),
  }
}

// ── Prompt système par langue ─────────────────────────────────────────────────

function buildSystemPrompt(locale: string, shopContext: string): string {
  const rules = `
Tu es l'assistant WhatsApp de réservation de ${shopContext.split('\n')[0].replace('SHOP: ', '')}, une boutique de location de vélos.

DONNÉES DU SHOP:
${shopContext}

RÈGLES:
- Réponds en ${LANG_NAMES[locale] ?? 'anglais'} — toujours dans cette langue
- Messages courts (2-4 phrases max — format WhatsApp)
- Tu peux répondre aux questions sur : disponibilités, tarifs, localisation, types de vélos
- Pour une demande de réservation : collecte type de vélo + dates + nom du client
  → Si tu as toutes les infos, TERMINE ta réponse avec exactement ce bloc JSON :
  ##BOOKING##{"bikeType":"CITY","startAt":"2026-06-21T10:00:00","endAt":"2026-06-21T18:00:00","customerName":"Jean Dupont"}##
  → Les types valides : CITY, ELECTRIC, MOUNTAIN, CARGO, KIDS, ESCOOTER, ROAD, TANDEM, FATBIKE, EMTB
  → Si des informations manquent, demande-les simplement
- Pas d'emojis — messages professionnels et sobres
- Ne fais jamais de promesses sur des choses que tu ne peux pas confirmer
- Si tu ne sais pas, dis-le et propose d'appeler le shop
`.trim()

  return rules
}

const LANG_NAMES: Record<string, string> = {
  fr: 'français', es: 'espagnol', en: 'anglais', de: 'allemand',
  it: 'italien', nl: 'néerlandais', pt: 'portugais',
}

// ── Messages de fallback par langue ─────────────────────────────────────────

const FALLBACK_MSG: Record<string, string> = {
  fr: "Bonjour ! Je n'ai pas pu identifier votre boutique. Merci de contacter directement votre loueur de vélos.",
  es: "¡Hola! No pude identificar tu tienda. Por favor contacta directamente con tu tienda de alquiler.",
  en: "Hello! I couldn't identify your shop. Please contact your bike rental shop directly.",
  de: "Hallo! Ich konnte Ihr Geschäft nicht identifizieren. Bitte kontaktieren Sie Ihr Fahrradverleih direkt.",
  it: "Ciao! Non ho potuto identificare il tuo negozio. Contatta direttamente il tuo noleggio bici.",
  nl: "Hallo! Ik kon uw winkel niet identificeren. Neem rechtstreeks contact op met uw fietsverhuur.",
  pt: "Olá! Não consegui identificar a sua loja. Por favor contacte diretamente a sua loja de aluguel.",
}

const BOOKING_CONFIRM: Record<string, (name: string, bike: string, start: string, end: string) => string> = {
  fr: (name, bike, start, end) => `Réservation confirmée — ${name}\n*Vélo :* ${bike}\n*Du* ${start} *au* ${end}\nNous vous attendons.`,
  es: (name, bike, start, end) => `Reserva confirmada — ${name}\n*Bici :* ${bike}\n*Del* ${start} *al* ${end}\nTe esperamos.`,
  en: (name, bike, start, end) => `Booking confirmed — ${name}\n*Bike:* ${bike}\n*From* ${start} *to* ${end}\nSee you soon.`,
  de: (name, bike, start, end) => `Buchung bestätigt — ${name}\n*Fahrrad:* ${bike}\n*Von* ${start} *bis* ${end}\nWir freuen uns auf Sie.`,
  it: (name, bike, start, end) => `Prenotazione confermata — ${name}\n*Bici:* ${bike}\n*Dal* ${start} *al* ${end}\nCi vediamo presto.`,
  nl: (name, bike, start, end) => `Reservering bevestigd — ${name}\n*Fiets:* ${bike}\n*Van* ${start} *tot* ${end}\nTot ziens.`,
  pt: (name, bike, start, end) => `Reserva confirmada — ${name}\n*Bicicleta:* ${bike}\n*De* ${start} *a* ${end}\nAté logo.`,
}

const BOOKING_ERROR: Record<string, string> = {
  fr: "Désolé, une erreur s'est produite lors de la réservation. Merci d'appeler directement le shop.",
  es: "Lo siento, hubo un error al crear la reserva. Por favor llama directamente a la tienda.",
  en: "Sorry, an error occurred while creating the booking. Please call the shop directly.",
  de: "Entschuldigung, bei der Buchung ist ein Fehler aufgetreten. Bitte rufen Sie das Geschäft direkt an.",
  it: "Mi dispiace, si è verificato un errore durante la prenotazione. Ti preghiamo di chiamare direttamente il negozio.",
  nl: "Sorry, er is een fout opgetreden bij het aanmaken van de reservering. Bel de winkel rechtstreeks.",
  pt: "Desculpe, ocorreu um erro ao criar a reserva. Por favor ligue diretamente para a loja.",
}

// ── TwiML reply helper ───────────────────────────────────────────────────────

function twimlReply(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Twilio envoie en application/x-www-form-urlencoded
    const body    = await req.text()
    const params  = new URLSearchParams(body)
    const rawFrom = params.get('From') ?? ''
    const msgBody = params.get('Body')?.trim() ?? ''

    if (!msgBody || !rawFrom) {
      return twimlReply('.')
    }

    const customerPhone = cleanPhone(rawFrom)
    const locale        = detectLocale({ phone: customerPhone, fallback: 'en' })

    // Trouver le tenant
    const tenantId = await findTenant(customerPhone)

    if (!tenantId) {
      return twimlReply(FALLBACK_MSG[locale] ?? FALLBACK_MSG['en'])
    }

    // Contexte shop
    const { tenant, context: shopContext } = await buildShopContext(tenantId)

    // Appel IA
    const systemPrompt = buildSystemPrompt(locale, shopContext)
    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: msgBody }],
    })

    let aiText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    // ── Détecter une demande de réservation ──
    const bookingMatch = aiText.match(/##BOOKING##(\{.*?\})##/)
    if (bookingMatch) {
      // Retirer le bloc JSON du message visible
      aiText = aiText.replace(/##BOOKING##.*?##/s, '').trim()

      try {
        const bookingData = JSON.parse(bookingMatch[1])
        const { bikeType, startAt, endAt, customerName } = bookingData

        // Trouver un vélo disponible du bon type
        const bike = await prisma.bike.findFirst({
          where: { tenantId, status: 'AVAILABLE', type: bikeType },
        })

        // Créer la réservation
        await prisma.reservation.create({
          data: {
            tenantId,
            bikeId:        bike?.id ?? null,
            bikeType:      bikeType ?? null,
            customerName:  customerName ?? 'Client WhatsApp',
            customerPhone,
            customerEmail: `whatsapp+${customerPhone.replace('+', '')}@velorent.app`,
            status:        'CONFIRMED',
            source:        'WHATSAPP',
            startAt:       new Date(startAt),
            endAt:         new Date(endAt),
            notes:         `Réservation via WhatsApp — message original: "${msgBody}"`,
          },
        })

        // Message de confirmation
        const dlFmt = (d: string) => new Date(d).toLocaleDateString(
          locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-GB',
          { day: 'numeric', month: 'long' }
        )
        const confirmMsg = (BOOKING_CONFIRM[locale] ?? BOOKING_CONFIRM['en'])(
          customerName ?? 'Client',
          bike?.name ?? bikeType,
          dlFmt(startAt),
          dlFmt(endAt),
        )

        // Envoyer d'abord la réponse IA, puis la confirmation
        const fullReply = aiText ? `${aiText}\n\n${confirmMsg}` : confirmMsg
        return twimlReply(fullReply)

      } catch (bookingErr) {
        console.error('[whatsapp-agent] Erreur réservation:', bookingErr)
        return twimlReply(aiText || (BOOKING_ERROR[locale] ?? BOOKING_ERROR['en']))
      }
    }

    return twimlReply(aiText || (FALLBACK_MSG[locale] ?? FALLBACK_MSG['en']))

  } catch (err) {
    console.error('[whatsapp-agent]', err)
    return twimlReply('Sorry, a technical error occurred. Please try again.')
  }
}

// Twilio vérifie la méthode GET pour valider le webhook
export async function GET() {
  return new NextResponse('VeloRent WhatsApp Webhook OK', { status: 200 })
}
