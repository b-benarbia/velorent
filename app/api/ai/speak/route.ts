import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireSession } from '@/lib/session'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Map locale → best OpenAI voice
// nova = warm female (great for most languages)
// onyx = deep male
const VOICE_MAP: Record<string, 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'> = {
  fr: 'nova',
  en: 'nova',
  es: 'nova',
  de: 'nova',
  it: 'nova',
  nl: 'nova',
  pt: 'nova',
}

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { text, locale } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Limit text length to avoid excessive API cost
    const truncated = text.slice(0, 1000)
    const voice = VOICE_MAP[locale] ?? 'nova'

    const response = await openai.audio.speech.create({
      model: 'tts-1',       // tts-1 = rapide et naturel / tts-1-hd = qualité supérieure
      voice,
      input: truncated,
      response_format: 'mp3',
      speed: 1.0,
    })

    // Stream audio back to client
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
    console.error('[AI/speak]', err)
    return NextResponse.json({ error: 'TTS error' }, { status: 500 })
  }
}
