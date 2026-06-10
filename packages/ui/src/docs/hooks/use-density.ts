import { useEffect, useState } from 'react'
import { type DensityLevel, densityLevels } from '../../providers/density'

const STORAGE_KEY = 'density'

function readStoredDensity(): DensityLevel {
	const stored = localStorage.getItem(STORAGE_KEY)

	if (densityLevels.some((level) => level.value === stored)) return stored as DensityLevel

	return 'snug'
}

/**
 * Persisted docs density preference (`loose | snug | compact`), defaulting to
 * `snug`, the ambient `<Density>` default.
 */
export function useDensity() {
	const [density, setDensity] = useState<DensityLevel>(readStoredDensity)

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, density)
	}, [density])

	return [density, setDensity] as const
}
