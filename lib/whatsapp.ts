/**
 * Service d'envoi de messages WhatsApp via Twilio.
 *
 * Variables d'environnement requises :
 *   TWILIO_ACCOUNT_SID   — ex: ACxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN    — ex: xxxxxxxxxxxxxxxx
 *   TWILIO_WHATSAPP_FROM — ex: whatsapp:+14155238886 (sandbox Twilio)
 *
 * Pour activer le sandbox Twilio WhatsApp (test gratuit) :
 *   1. Créer un compte sur twilio.com
 *   2. Aller dans Messaging → Try it out → Send a WhatsApp message
 *   3. Scanner le QR code avec ton téléphone pour rejoindre le sandbox
 *   4. Copier les credentials dans .env
 */

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN sont requis dans .env')
  }
  return twilio(accountSid, authToken)
}

/**
 * Formater un numéro en format WhatsApp Twilio.
 * "0612345678" → "whatsapp:+33612345678" si préfixe inconnu
 * "+34612345678" → "whatsapp:+34612345678"
 */
export function toWhatsAppNumber(phone: string): string {
  const clean = phone.replace(/\s+/g, '').replace(/^00/, '+')
  const number = clean.startsWith('+') ? clean : `+${clean}`
  return `whatsapp:${number}`
}

/**
 * Envoyer un message texte WhatsApp.
 * @param to — numéro du destinataire, ex: "+34612345678"
 * @param body — texte du message
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  try {
    const client = getClient()
    await client.messages.create({
      from: fromNumber,
      to: toWhatsAppNumber(to),
      body,
    })
    return true
  } catch (err) {
    console.error('[WhatsApp] Erreur envoi texte:', err)
    return false
  }
}

/**
 * Envoyer une note vocale WhatsApp (MP3 via URL publique).
 * Twilio va fetch l'URL mediaUrl pour récupérer l'audio et l'envoyer en voice note.
 * @param to       — numéro du destinataire
 * @param mediaUrl — URL publique du fichier MP3 (notre endpoint /api/ai/voice-chase)
 * @param caption  — texte court affiché sous la note vocale (optionnel, fallback si audio échoue)
 */
export async function sendWhatsAppVoice(to: string, mediaUrl: string, caption?: string): Promise<boolean> {
  try {
    const client = getClient()
    await client.messages.create({
      from: fromNumber,
      to: toWhatsAppNumber(to),
      mediaUrl: [mediaUrl],
      body: caption ?? '',
    })
    return true
  } catch (err) {
    console.error('[WhatsApp] Erreur envoi vocal:', err)
    // Fallback : envoyer en texte si le vocal échoue
    if (caption) {
      try {
        const client2 = getClient()
        await client2.messages.create({ from: fromNumber, to: toWhatsAppNumber(to), body: caption })
        return true
      } catch { return false }
    }
    return false
  }
}

/**
 * Vérifier si le service WhatsApp est configuré.
 */
export function isWhatsAppConfigured(): boolean {
  return Boolean(accountSid && authToken)
}
