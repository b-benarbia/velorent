/**
 * GET /api/ai/voice-chase?text=...&locale=...&sig=...
 *
 * Endpoint public (appelé par Twilio pour récupérer l'audio).
 * Génère un TTS OpenAI à la volée et retourne le MP3.
 * Protégé par une signature HMAC pour éviter les abus.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createHmac } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const VOICE_MAP: Record<string, 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'> = {
  fr: 'nova', en: 'nova', es: 'nova', de: 'nova', it: 'nova', nl: 'nova', pt: 'nova',
}

export function buildVoiceChaseUrl(baseUrl: string, text: string, locale: string): string {
  const sig = createHmac('sha256', process.env.JWT_SECRET ?? 'velorent')
    .update(`${text}|${locale}`)
    .digest('hex')
    .slice(0, 24)
  const params = new URLSearchParams({ text: text.slice(0, 800), locale, sig })
  return `${baseUrl}/api/ai/voice-chase?${params.toString()}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const text   = searchParams.get('text')   ?? ''
  const locale = searchParams.get('locale') ?? 'es'
  const sig    = searchParams.get('sig')    ?? ''

  if (!text) return new NextResponse('Missing text', { status: 400 })

  // Vérifier la signature
  const expected = createHmac('sha256', process.env.JWT_SECRET ?? 'velorent')
    .update(`${text}|${locale}`)
    .digest('hex')
    .slice(0, 24)

  if (sig !== expected) {
    return new NextResponse('Invalid signature', { status: 403 })
  }

  try {
    const voice = VOICE_MAP[locale] ?? 'nova'
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text.slice(0, 800),
      response_format: 'mp3',
      speed: 0.95, // légèrement plus lent = plus clair pour un message urgent
    })

    const audioBuffer = Buffer.from(await response.arrayBuffer())

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[voice-chase]', err)
    return new NextResponse('TTS error', { status: 500 })
  }
}
