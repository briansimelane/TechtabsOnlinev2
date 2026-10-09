import { OPERATIONS_CONSTANTS, getOverriddenValue } from '../constants';
import CONFIG from '../resources/config.json';

export const getCapexPerUnit = (customConfig?: any): number => {
  if (customConfig?.costs?.capacity?.capex_per_unit !== undefined) {
    return Number(customConfig.costs.capacity.capex_per_unit);
  }
  const defaultVal = (CONFIG as any).costs?.capacity?.capex_per_unit ?? OPERATIONS_CONSTANTS.capexUnitCost;
  return getOverriddenValue(['costs', 'capacity', 'capex_per_unit'], 0, defaultVal);
};

export const capacityExpansionCost = (capacityChange: number, customConfig?: any): number =>
  capacityChange > 0 ? capacityChange * getCapexPerUnit(customConfig) : 0;
