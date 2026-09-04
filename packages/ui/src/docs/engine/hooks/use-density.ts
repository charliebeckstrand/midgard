import { type DensityLevel, densityLevels } from '../../../providers/density'
import { usePersistedChoice } from './use-persisted-choice'

const STORAGE_KEY = 'density'

const DENSITY_VALUES = densityLevels.map((level) => level.value)

/**
 * Persisted docs density preference (`loose | snug | compact`), defaulting to
 * `snug`, the ambient `<Density>` default.
 */
export function useDensity() {
	return usePersistedChoice<DensityLevel>(STORAGE_KEY, DENSITY_VALUES, 'snug')
}
