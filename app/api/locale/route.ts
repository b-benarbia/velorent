import { NextRequest, NextResponse } from 'next/server'
import { locales } from '@/i18n/request'

export async function POST(req: NextRequest) {
  const { locale } = await req.json()
  if (!locales.includes(locale)) {
    return NextResponse.json({ error: 'Locale invalide' }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return res
}
