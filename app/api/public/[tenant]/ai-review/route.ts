/**
 * GET /api/public/[tenant]/ai-review?token=...&stars=5&lang=en
 * Génère un texte d'avis Google réaliste via Claude Haiku.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Types de vélos → description pour le prompt
const BIKE_LABEL: Record<string, string> = {
  CITY: 'city bike', ELECTRIC: 'electric bike', MOUNTAIN: 'mountain bike',
  ROAD: 'road bike', CARGO: 'cargo bike', KIDS: 'kids bike',
  TANDEM: 'tandem bike', FATBIKE: 'fat bike', EMTB: 'electric mountain bike',
  ESCOOTER: 'electric scooter',
}

// Instructions de langue pour le prompt
const LANG_INSTRUCTION: Record<string, string> = {
  fr: 'Write the review in French.',
  en: 'Write the review in English.',
  es: 'Write the review in Spanish.',
  de: 'Write the review in German.',
  it: 'Write the review in Italian.',
  nl: 'Write the review in Dutch.',
  pt: 'Write the review in Portuguese.',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') ?? ''
  const stars  = parseInt(searchParams.get('stars') ?? '5')
  const lang   = searchParams.get('lang') ?? 'en'

  if (!token || stars < 4) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  try {
    const rows = await prisma.$queryRaw<Array<{
      bikeName: string | null; bikeType: string | null
      startAt: Date; endAt: Date | null
      shopName: string; shopCity: string | null
    }>>`
      SELECT
        b.name     AS "bikeName",
        b.type     AS "bikeType",
        r."startAt",
        r."endAt",
        t.name     AS "shopName",
        t.address  AS "shopCity"
      FROM rentals r
      JOIN tenants t ON t.id = r."tenantId"
      LEFT JOIN bikes b ON b.id = r."bikeId"
      WHERE t.slug = ${slug}
        AND r."reviewToken" = ${token}
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
    }

    const row = rows[0]
    const bikeLabel = BIKE_LABEL[row.bikeType ?? ''] ?? 'bike'
    const city = row.shopCity?.split(',')[0]?.trim() ?? 'the city'
    const langInstruction = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION['en']

    // Durée de la location
    let durationText = ''
    if (row.endAt && row.startAt) {
      const hours = Math.round((new Date(row.endAt).getTime() - new Date(row.startAt).getTime()) / 3600000)
      if (hours < 24) durationText = `${hours} hours`
      else durationText = `${Math.round(hours / 24)} day${Math.round(hours / 24) > 1 ? 's' : ''}`
    }

    const prompt = `You are helping a tourist write a genuine Google Maps review for a bike rental shop.

Context:
- Shop: "${row.shopName}" in ${city}
- Vehicle rented: ${bikeLabel}${row.bikeName ? ` (${row.bikeName})` : ''}
${durationText ? `- Duration: ${durationText}` : ''}
- Star rating: ${stars}/5

Task: Write a short, natural, authentic 2-3 sentence Google review as if you were the tourist.
${langInstruction}
- Sound like a real person, not marketing copy
- Vary sentence structure — avoid starting with "I rented" every time
- Mention the city or experience of exploring
- Keep it 40-70 words
- Do NOT include star emojis or ratings in the text
- Return ONLY the review text, nothing else`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const reviewText = (message.content[0] as { text: string }).text.trim()

    return NextResponse.json({ reviewText })
  } catch (err) {
    console.error('[ai-review:GET]', err)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
