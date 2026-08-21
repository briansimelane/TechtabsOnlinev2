import { SimulationClass, ScenarioVariant } from '../types';
import { SCENARIO_TEMPLATES } from '../constants';

export interface ResolvedScenario {
  period: number;
  title: string;
  body: string;
  hidden: boolean;          // true => must not be shown to students
  source: 'override' | 'variant' | 'none';
  variantId?: string;
  availableVariants: ScenarioVariant[];  // for the facilitator variant picker
}

export function resolveScenario(cls: SimulationClass | undefined, period: number): ResolvedScenario {
  const variants = (cls && SCENARIO_TEMPLATES[period]) || SCENARIO_TEMPLATES[period] || [];
  const override = cls?.scenarioOverrides?.[period];

  // 1. Full custom override body wins.
  if (override?.body != null && override.body.trim() !== '') {
    return {
      period,
      title: override.title?.trim() || `Period ${period} Scenario`,
      body: override.body,
      hidden: !!override.hidden,
      source: 'override',
      availableVariants: variants,
    };
  }

  // 2. Otherwise a selected template variant (or the first template variant).
  const chosen =
    variants.find(v => v.id === override?.activeVariantId) ?? variants[0];

  if (chosen) {
    return {
      period,
      title: chosen.title,
      body: chosen.body,
      hidden: !!override?.hidden,
      source: 'variant',
      variantId: chosen.id,
      availableVariants: variants,
    };
  }

  // 3. Nothing defined for this period.
  return {
    period,
    title: `Period ${period} Scenario`,
    body: '',
    hidden: !!override?.hidden,
    source: 'none',
    availableVariants: variants,
  };
}
