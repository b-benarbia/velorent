import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const tenantId = session.tenantId
    const { question, locale } = await req.json()

    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const now = new Date()
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart   = new Date(now.getFullYear(), 0, 1)
    const thirtyAgo   = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
    const sevenAgo    = new Date(now.getTime() -  7 * 24 * 3600 * 1000)
    const nextSevenDays = new Date(now.getTime() + 7 * 24 * 3600 * 1000)

    // ── Fetch ALL shop data in parallel ──
    const [
      activeRentals,
      overdueRentals,
      allBikes,
      upcomingReservations,
      pendingReservations,
      todayStats,
      weekStats,
      monthStats,
      yearStats,
      last30Rentals,
      allCustomers,
      topCustomers30d,
      accessories,
      partners,
      recentInvoices,
      staff,
      tenant,
    ] = await Promise.all([

      // Locations actives
      prisma.rental.findMany({
        where: { tenantId, status: 'ACTIVE' },
        include: { customer: true, bikes: { include: { bike: true } }, bike: true },
        orderBy: { startAt: 'asc' },
      }),

      // Locations en retard
      prisma.rental.findMany({
        where: {
          tenantId, status: 'ACTIVE',
          expectedReturnAt: { lt: now },
        },
        include: { customer: true, bikes: { include: { bike: true } }, bike: true },
        orderBy: { expectedReturnAt: 'asc' },
      }),

      // Toute la flotte avec détails
      prisma.bike.findMany({
        where: { tenantId },
        orderBy: [{ status: 'asc' }, { code: 'asc' }],
      }),

      // Réservations à venir (7 prochains jours)
      prisma.reservation.findMany({
        where: {
          tenantId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startAt: { gte: now, lte: nextSevenDays },
        },
        include: { customer: true, bike: true },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),

      // Réservations en attente de confirmation
      prisma.reservation.count({
        where: { tenantId, status: 'PENDING' },
      }),

      // CA aujourd'hui
      prisma.invoice.aggregate({
        where: { tenantId, issuedAt: { gte: todayStart } },
        _sum: { amountTtc: true, amountHt: true },
        _count: true,
      }),

      // CA cette semaine
      prisma.invoice.aggregate({
        where: { tenantId, issuedAt: { gte: sevenAgo } },
        _sum: { amountTtc: true },
        _count: true,
      }),

      // CA ce mois
      prisma.invoice.aggregate({
        where: { tenantId, issuedAt: { gte: monthStart } },
        _sum: { amountTtc: true },
        _count: true,
      }),

      // CA cette année
      prisma.invoice.aggregate({
        where: { tenantId, issuedAt: { gte: yearStart } },
        _sum: { amountTtc: true },
        _count: true,
      }),

      // 30 dernières locations clôturées
      prisma.rental.findMany({
        where: { tenantId, status: 'COMPLETED', endAt: { gte: thirtyAgo } },
        include: {
          customer: true,
          bikes: { include: { bike: true } },
          bike: true,
          invoice: true,
        },
        orderBy: { endAt: 'desc' },
        take: 50,
      }),

      // Stats clients
      prisma.customer.aggregate({
        where: { tenantId },
        _count: true,
      }),

      // Top clients 30 jours
      prisma.rental.groupBy({
        by: ['customerId'],
        where: { tenantId, createdAt: { gte: thirtyAgo } },
        _count: true,
        orderBy: { _count: { customerId: 'desc' } },
        take: 5,
      }),

      // Inventaire accessoires
      prisma.accessory.groupBy({
        by: ['type', 'status'],
        where: { tenantId },
        _count: true,
      }),

      // Partenaires actifs
      prisma.partner.findMany({
        where: { tenantId, isActive: true },
        select: { name: true, discountPct: true },
      }),

      // 10 dernières factures
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { issuedAt: 'desc' },
        take: 10,
        include: { rental: { include: { customer: true } } },
      }),

      // Membres du staff
      prisma.user.findMany({
        where: { tenantId },
        select: { name: true, email: true, role: true, lastLoginAt: true },
      }),

      // Infos boutique
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, plan: true, currency: true, taxRate: true },
      }),
    ])

    // ── Dériver les stats ──
    const availableBikes   = allBikes.filter(b => b.status === 'AVAILABLE').length
    const rentedBikes      = allBikes.filter(b => b.status === 'RENTED').length
    const maintenanceBikes = allBikes.filter(b => b.status === 'MAINTENANCE').length
    const retiredBikes     = allBikes.filter(b => b.status === 'RETIRED').length
    const totalBikes       = allBikes.length

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmt = (n: any) => Number(n ?? 0).toFixed(2)
    const todayRev  = fmt(todayStats._sum.amountTtc)
    const weekRev   = fmt(weekStats._sum.amountTtc)
    const monthRev  = fmt(monthStats._sum.amountTtc)
    const yearRev   = fmt(yearStats._sum.amountTtc)

    const avgBasket = last30Rentals.length > 0
      ? (last30Rentals.reduce((s, r) => s + Number(r.invoice?.amountTtc ?? 0), 0) / last30Rentals.length).toFixed(2)
      : '0'

    // Top vélos 30j
    const bikeUsage: Record<string, { name: string; type: string; count: number }> = {}
    last30Rentals.forEach(r => {
      const bs = r.bikes?.map(rb => rb.bike) ?? (r.bike ? [r.bike] : [])
      bs.forEach(b => {
        if (!b) return
        if (!bikeUsage[b.id]) bikeUsage[b.id] = { name: b.name, type: b.type, count: 0 }
        bikeUsage[b.id].count++
      })
    })
    const topBikes = Object.values(bikeUsage).sort((a, b) => b.count - a.count).slice(0, 5)

    // Accessoires résumé
    const accSummary: Record<string, { available: number; rented: number; total: number }> = {}
    accessories.forEach(a => {
      if (!accSummary[a.type]) accSummary[a.type] = { available: 0, rented: 0, total: 0 }
      accSummary[a.type].total += a._count
      if (a.status === 'AVAILABLE') accSummary[a.type].available += a._count
      if (a.status === 'RENTED') accSummary[a.type].rented += a._count
    })

    // ── Construire le contexte complet ──
    const context = `=== DONNÉES COMPLÈTES DU SHOP "${tenant?.name}" (${now.toLocaleString('fr-FR')}) ===

🏪 BOUTIQUE:
- Nom: ${tenant?.name} | Plan: ${tenant?.plan} | Devise: ${tenant?.currency} | TVA: ${tenant?.taxRate}%
- Staff: ${staff.map(s => `${s.name} (${s.role})`).join(', ')}

📊 TABLEAU DE BORD EN TEMPS RÉEL:
- Locations actives: ${activeRentals.length}
- En retard: ${overdueRentals.length}
- Réservations en attente de confirmation: ${pendingReservations}

💰 REVENUS:
- Aujourd'hui: ${todayRev}€ (${todayStats._count} locations)
- Cette semaine: ${weekRev}€ (${weekStats._count} locations)
- Ce mois: ${monthRev}€ (${monthStats._count} locations)
- Cette année: ${yearRev}€ (${yearStats._count} locations)
- Panier moyen (30j): ${avgBasket}€

🚲 FLOTTE (${totalBikes} vélos total):
- Disponibles: ${availableBikes}
- En location: ${rentedBikes}
- En maintenance: ${maintenanceBikes}
- Retirés: ${retiredBikes}
DÉTAIL PAR VÉLO:
${allBikes.map(b => `  • [${b.code}] ${b.name} | ${b.type} | ${b.status} | ${b.dailyRate}€/j${b.notes ? ` | Note: ${b.notes}` : ''}`).join('\n')}

🔑 LOCATIONS ACTIVES (${activeRentals.length}):
${activeRentals.length === 0 ? '  Aucune' : activeRentals.map(r => {
  const bike = r.bikes?.[0]?.bike ?? r.bike
  const elapsed = Math.round((now.getTime() - new Date(r.startAt).getTime()) / 3600000)
  const isLate = r.expectedReturnAt && new Date(r.expectedReturnAt) < now
  const lateMin = isLate ? Math.round((now.getTime() - new Date(r.expectedReturnAt!).getTime()) / 60000) : 0
  return `  • ${r.customer.firstName} ${r.customer.lastName} | Tél: ${r.customer.phone ?? 'N/A'} | ${bike?.name} (${bike?.code}) | Départ: ${new Date(r.startAt).toLocaleString('fr-FR')} | ${elapsed}h en cours | Retour prévu: ${r.expectedReturnAt ? new Date(r.expectedReturnAt).toLocaleString('fr-FR') : 'non défini'}${isLate ? ` ⚠️ EN RETARD ${lateMin}min` : ''} | Paiement: ${r.paymentMethod} | Caution: ${r.depositAmount}€`
}).join('\n')}

${overdueRentals.length > 0 ? `⚠️ EN RETARD (${overdueRentals.length}):
${overdueRentals.map(r => {
  const bike = r.bikes?.[0]?.bike ?? r.bike
  const lateMin = Math.round((now.getTime() - new Date(r.expectedReturnAt!).getTime()) / 60000)
  return `  • ${r.customer.firstName} ${r.customer.lastName} | Tél: ${r.customer.phone ?? 'N/A'} | ${bike?.name} | ${lateMin} min de retard`
}).join('\n')}` : '✅ Aucun retard'}

📅 RÉSERVATIONS À VENIR (7 jours):
${upcomingReservations.length === 0 ? '  Aucune' : upcomingReservations.map(r => {
  return `  • ${r.customerName} | Tél: ${r.customerPhone ?? 'N/A'} | ${new Date(r.startAt).toLocaleString('fr-FR')} → ${new Date(r.endAt).toLocaleString('fr-FR')} | ${r.bike ? r.bike.name : 'Vélo non attribué'} | Statut: ${r.status}`
}).join('\n')}

📈 TOP VÉLOS (30 derniers jours):
${topBikes.length === 0 ? '  Pas assez de données' : topBikes.map((b, i) => `  ${i + 1}. ${b.name} (${b.type}) — ${b.count} locations`).join('\n')}

👥 CLIENTS:
- Total: ${allCustomers._count} clients enregistrés

🎒 ACCESSOIRES:
${Object.entries(accSummary).length === 0 ? '  Aucun' : Object.entries(accSummary).map(([type, s]) => `  • ${type}: ${s.available} dispo / ${s.total} total`).join('\n')}

🤝 PARTENAIRES HÔTELS ACTIFS:
${partners.length === 0 ? '  Aucun' : partners.map(p => `  • ${p.name} (remise: ${p.discountPct}%)`).join('\n')}

🧾 DERNIÈRES FACTURES:
${recentInvoices.map(inv => `  • N°${inv.number} | ${inv.rental.customer.firstName} ${inv.rental.customer.lastName} | ${Number(inv.amountTtc).toFixed(2)}€ TTC | ${new Date(inv.issuedAt).toLocaleDateString('fr-FR')}`).join('\n')}`

    const systemPrompt = `Tu es le copilot vocal de VeloRent, assistant pour gérants de boutiques de location de vélos.

RÈGLE ABSOLUE — BRIÈVETÉ :
- Question factuelle simple ("combien de vélos ?", "qui est en retard ?", "CA du jour ?") → 1 seule phrase, chiffre inclus. Rien de plus.
- Question opérationnelle ("que faire ?", "analyse", "conseil") → 2-3 phrases max.
- Ne jamais ajouter de conseils, mises en garde, ou informations non demandées.
- Ne jamais répéter la question posée.
- Pas de listes, pas de bullet points. Une réponse orale naturelle.
- Pas d'emojis dans les réponses.

EXEMPLES CORRECTS :
- "combien de vélos disponibles ?" → "Tu as 4 vélos disponibles."
- "qui est en retard ?" → "Carlos Martinez avec le Trek Bleu, 23 minutes de retard, son numéro est le +34 612 345 678."
- "CA aujourd'hui ?" → "340 euros aujourd'hui, sur 8 locations."
- "réservations demain ?" → "2 réservations demain : Alex à 9h et Bilal à 14h."

Langue de réponse : ${locale}. Chiffres exacts uniquement depuis les données.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Données du shop:\n${context}\n\nQuestion: ${question}`,
      }],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : 'Impossible de répondre.'
    return NextResponse.json({ answer })

  } catch (err) {
    console.error('[AI/ask]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
