/**
 * DynamicPricingConfig — partagé entre route API, moteur de calcul, et widget
 * Séparé du route handler pour éviter les imports circulaires côté client/serveur
 */

export interface DynamicPricingConfig {
  enabled:                   boolean
  minMultiplier:             number   // ex: 0.7  → prix min = 70% du tarif de base
  maxMultiplier:             number   // ex: 1.5  → prix max = 150%
  weekendBonus:              number   // ex: 0.15 → +15% le week-end
  highUtilizationThreshold:  number   // ex: 0.8  → au-delà de 80% d'occupation → premium
  highUtilizationPremium:    number   // ex: 0.20 → +20%
  lowUtilizationThreshold:   number   // ex: 0.4  → en dessous de 40% → réduction
  lowUtilizationDiscount:    number   // ex: 0.15 → -15%
  seasonalRules: Array<{
    months: number[]         // 1-12
    factor: number           // ex: 0.20 = +20%
  }>
}

export const DEFAULT_CONFIG: DynamicPricingConfig = {
  enabled:                  false,
  minMultiplier:            0.7,
  maxMultiplier:            1.5,
  weekendBonus:             0.15,
  highUtilizationThreshold: 0.8,
  highUtilizationPremium:   0.20,
  lowUtilizationThreshold:  0.4,
  lowUtilizationDiscount:   0.15,
  seasonalRules: [
    { months: [6, 7, 8],  factor:  0.20 },
    { months: [12, 1, 2], factor: -0.10 },
  ],
}
