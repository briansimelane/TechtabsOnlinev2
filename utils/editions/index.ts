import { SimulationClass } from '../../types';
import { EditionConfig } from './types';
import globalMarketsJson from '../../resources/editions/global-markets.json';

export * from './types';

export const EDITIONS: Record<string, EditionConfig> = {
  'global-markets': globalMarketsJson as unknown as EditionConfig
};

export const getEdition = (cls?: { editionId?: string } | SimulationClass | null): EditionConfig | null =>
  cls?.editionId && cls.editionId !== 'standard' ? (EDITIONS[cls.editionId] ?? null) : null;
