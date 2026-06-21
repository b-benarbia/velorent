/**
 * Moteur de tarification dynamique VeloRent
 *
 * Calcule un multiplicateur de prix en fonction de :
 *   - Utilisation de la flotte (temps réel)
 *   - Jour de la semaine (week-end → prime)
 *   - Saison (été → prime, hiver → réduction)
 *
 * Conçu pour être extensible (météo, événements locaux…)
 */

import type { DynamicPricingConfig } from '@/lib/dynamicPricingConfig'

export interface PricingContext {
  config:          DynamicPricingConfig
  startDate:       Date
  utilizationRate: number   // 0-1, fraction de la flotte occupée
}

export interface PricingResult {
  multiplier:      number   // ex: 1.20
  baseMultiplier:  number   // avant clamping
  factors: {
    weekend:       number
    seasonal:      number
    utilization:   number
  }
  label:           string   // ex: "Prix en forte demande"
  badge:           'peak' | 'discount' | 'normal'
}

export function calculateMultiplier(ctx: PricingContext): PricingResult {
  const { config, startDate, utilizationRate } = ctx

  if (!config.enabled) {
    return {
      multiplier:     1,
      baseMultiplier: 1,
      factors:        { weekend: 0, seasonal: 0, utilization: 0 },
      label:          '',
      badge:          'normal',
    }
  }

  // ── Week-end (samedi=6, dimanche=0) ──────────────────────────────────────
  const day = startDate.getDay()
  const weekendFactor = (day === 0 || day === 6) ? (config.weekendBonus ?? 0.15) : 0

  // ── Saisonnalité ─────────────────────────────────────────────────────────
  const month = startDate.getMonth() + 1 // 1-12
  let seasonalFactor = 0
  for (const rule of config.seasonalRules ?? []) {
    if (rule.months.includes(month)) {
      seasonalFactor += rule.factor
      break
    }
  }

  // ── Utilisation flotte ───────────────────────────────────────────────────
  let utilizationFactor = 0
  if (utilizationRate >= (config.highUtilizationThreshold ?? 0.8)) {
    utilizationFactor = config.highUtilizationPremium ?? 0.20
  } else if (utilizationRate <= (config.lowUtilizationThreshold ?? 0.4)) {
    utilizationFactor = -(config.lowUtilizationDiscount ?? 0.15)
  }

  const baseMultiplier = 1 + weekendFactor + seasonalFactor + utilizationFactor

  // ── Clamping ─────────────────────────────────────────────────────────────
  const multiplier = Math.max(
    config.minMultiplier ?? 0.7,
    Math.min(config.maxMultiplier ?? 1.5, baseMultiplier)
  )

  // ── Label & badge ────────────────────────────────────────────────────────
  let label = ''
  let badge: PricingResult['badge'] = 'normal'

  if (multiplier >= 1.15) {
    label = multiplier >= 1.30 ? 'Forte demande' : 'Demande élevée'
    badge = 'peak'
  } else if (multiplier <= 0.90) {
    label = 'Tarif réduit'
    badge = 'discount'
  }

  return {
    multiplier:     Math.round(multiplier * 100) / 100,
    baseMultiplier: Math.round(baseMultiplier * 100) / 100,
    factors:        {
      weekend:     Math.round(weekendFactor   * 100) / 100,
      seasonal:    Math.round(seasonalFactor  * 100) / 100,
      utilization: Math.round(utilizationFactor * 100) / 100,
    },
    label,
    badge,
  }
}

/**
 * Applique le multiplicateur à un prix de base.
 * Arrondi au 0.50€ le plus proche pour un rendu propre.
 */
export function applyMultiplier(basePrice: number, multiplier: number): number {
  const raw = basePrice * multiplier
  return Math.round(raw * 2) / 2  // arrondi 0.50
}
