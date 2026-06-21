/**
 * GET /api/public/[tenant]/ai-advisor?startAt=...&endAt=...
 *
 * Conseiller IA pour le widget de réservation public.
 * - Récupère la météo via Open-Meteo (gratuit, sans clé API)
 * - Interroge Claude pour un conseil personnalisé
 * - Retourne : météo résumée + conseil + tips + badge
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic                     from '@anthropic-ai/sdk'
import { prisma }                    from '@/lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Geocoding via Open-Meteo (gratuit) ───────────────────────────────────────
async function geocode(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    if (!data.results?.length) return null
    const r = data.results[0]
    return { lat: r.latitude, lon: r.longitude, name: r.name }
  } catch { return null }
}

// ── Météo forecast via Open-Meteo ────────────────────────────────────────────
interface DayForecast {
  date:       string
  tempMax:    number
  tempMin:    number
  rain:       number   // mm
  windMax:    number   // km/h
  weatherCode: number  // WMO code
}

function wmoDescription(code: number): string {
  if (code === 0)         return 'Ciel dégagé'
  if (code <= 3)          return 'Partiellement nuageux'
  if (code <= 9)          return 'Brouillard'
  if (code <= 19)         return 'Bruine'
  if (code <= 29)         return 'Pluie légère'
  if (code <= 39)         return 'Neige'
  if (code <= 49)         return 'Brouillard givrant'
  if (code <= 59)         return 'Bruine'
  if (code <= 69)         return 'Pluie'
  if (code <= 79)         return 'Neige'
  if (code <= 82)         return 'Averses de pluie'
  if (code <= 84)         return 'Averses de grêle'
  if (code <= 94)         return 'Orage'
  return 'Orage violent'
}

function wmoEmoji(code: number): string {
  if (code === 0)         return '☀️'
  if (code <= 3)          return '⛅'
  if (code <= 9)          return '🌫️'
  if (code <= 49)         return '🌧️'
  if (code <= 69)         return '🌧️'
  if (code <= 79)         return '❄️'
  if (code <= 82)         return '🌦️'
  if (code <= 94)         return '⛈️'
  return '⛈️'
}

async function getWeatherForecast(lat: number, lon: number, startAt: Date, endAt: Date): Promise<DayForecast[]> {
  try {
    const from = startAt.toISOString().slice(0, 10)
    const to   = endAt.toISOString().slice(0, 10)
    const url = [
      `https://api.open-meteo.com/v1/forecast`,
      `?latitude=${lat}&longitude=${lon}`,
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode`,
      `&start_date=${from}&end_date=${to}`,
      `&timezone=auto&forecast_days=16`,
    ].join('')

    const res  = await fetch(url, { next: { revalidate: 1800 } })
    const data = await res.json()

    if (!data.daily?.time) return []

    return data.daily.time.map((date: string, i: number) => ({
      date,
      tempMax:     Math.round(data.daily.temperature_2m_max[i] ?? 20),
      tempMin:     Math.round(data.daily.temperature_2m_min[i] ?? 12),
      rain:        Math.round((data.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      windMax:     Math.round(data.daily.windspeed_10m_max[i] ?? 10),
      weatherCode: data.daily.weathercode[i] ?? 0,
    }))
  } catch { return [] }
}

// ── Claude advice ─────────────────────────────────────────────────────────────
async function getClaudeAdvice(params: {
  tenantName:   string
  city:         string
  startAt:      Date
  endAt:        Date
  durationDays: number
  forecast:     DayForecast[]
  lang:         string
}): Promise<{ headline: string; body: string; tips: string[]; badge: 'perfect' | 'good' | 'caution' | 'warning' }> {

  const { tenantName, city, startAt, durationDays, forecast, lang } = params

  const forecastText = forecast.length
    ? forecast.map(d =>
        `${d.date}: ${wmoDescription(d.weatherCode)}, ${d.tempMin}–${d.tempMax}°C, pluie ${d.rain}mm, vent ${d.windMax}km/h`
      ).join('\n')
    : 'Météo non disponible'

  const langInstructions: Record<string, string> = {
    fr: 'Réponds en français.',
    es: 'Responde en español.',
    en: 'Reply in English.',
    de: 'Antworte auf Deutsch.',
    it: 'Rispondi in italiano.',
    nl: 'Antwoord in het Nederlands.',
    pt: 'Responde em português.',
  }

  const prompt = `Tu es un conseiller expert en location de vélos pour la boutique "${tenantName}" à ${city}.
Un client veut louer un vélo du ${startAt.toLocaleDateString('fr-FR')} pour ${durationDays} jour(s).

Prévisions météo :
${forecastText}

${langInstructions[lang] || langInstructions.fr}

Donne un conseil court et utile au client. Format JSON strict :
{
  "headline": "titre accrocheur de max 8 mots",
  "body": "1-2 phrases de conseil pratique personnalisé (météo, meilleur moment, précautions)",
  "tips": ["conseil court 1", "conseil court 2", "conseil court 3"],
  "badge": "perfect|good|caution|warning"
}

Règles badge :
- perfect = météo idéale (soleil, <5mm pluie, vent <25km/h)
- good = météo acceptable (nuages, <10mm pluie, vent <35km/h)
- caution = météo médiocre (pluie modérée ou vent fort)
- warning = météo mauvaise (pluie forte ou orage)

JSON uniquement, sans markdown.`

  try {
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    // Extraire JSON (parfois Claude wraps dans ```json```)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch {
    // Fallback si Claude échoue
    return {
      headline: 'Prêt pour l\'aventure ?',
      body:     'Vérifiez la météo avant de partir et prévoyez une couche imperméable en cas d\'averse.',
      tips:     ['Vérifiez la pression des pneus', 'Emportez une gourde', 'Portez un casque'],
      badge:    'good',
    }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params
    const { searchParams }  = req.nextUrl

    const startAtStr = searchParams.get('startAt')
    const endAtStr   = searchParams.get('endAt')
    const lang       = searchParams.get('lang') ?? 'fr'

    const tenant = await prisma.tenant.findUnique({
      where:  { slug },
      select: { name: true, address: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })

    const startAt = startAtStr ? new Date(startAtStr) : new Date()
    const endAt   = endAtStr   ? new Date(endAtStr)   : new Date(Date.now() + 86400000)
    const durationDays = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / 86400000))

    // Localisation du shop — utilise l'adresse complète pour le géocodage
    const cityQuery = tenant.address ?? ''

    // Géocodage
    const geo = cityQuery ? await geocode(cityQuery) : null
    const locationName = geo?.name ?? cityQuery ?? 'votre destination'

    // Prévisions météo
    const forecast = geo
      ? await getWeatherForecast(geo.lat, geo.lon, startAt, endAt)
      : []

    // Résumé météo pour le client
    const weatherSummary = forecast.length
      ? {
          days: forecast.map(d => ({
            date:        d.date,
            emoji:       wmoEmoji(d.weatherCode),
            description: wmoDescription(d.weatherCode),
            tempMax:     d.tempMax,
            tempMin:     d.tempMin,
            rain:        d.rain,
            windMax:     d.windMax,
          })),
          avgTempMax: Math.round(forecast.reduce((s, d) => s + d.tempMax, 0) / forecast.length),
          avgRain:    Math.round(forecast.reduce((s, d) => s + d.rain,   0) / forecast.length * 10) / 10,
        }
      : null

    // Conseil IA Claude
    const advice = await getClaudeAdvice({
      tenantName:   tenant.name,
      city:         locationName,
      startAt,
      endAt,
      durationDays,
      forecast,
      lang,
    })

    return NextResponse.json(
      {
        location:      locationName,
        weather:       weatherSummary,
        advice,
      },
      { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' } }
    )

  } catch (err) {
    console.error('[ai-advisor]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
