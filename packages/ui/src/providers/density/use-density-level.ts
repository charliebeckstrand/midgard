'use client'

import { toAmbientStep } from '../../core/density'
import { useDensityStep } from '../../primitives/density'
import { type DensityLevel, sizeToDensityLevel } from './context'

/**
 * Resolves a friendly `DensityLevel`: the explicit level, else the level of
 * the step that `useDensityStep` resolves. That step comes from the nearest
 * scope, else the root element, else `md`, which is `'snug'`. It serves a
 * client component whose props use `DensityLevel` rather than a density step.
 * {@link Grid} is one: its row estimate and its column fit key on the level
 * after mount.
 *
 * An outer step (`xs`, `xl`) clamps to the nearest ambient step.
 *
 * @remarks Client-only. It has its own `'use client'` file, so the
 * directive-free `DensityProvider` stays server-renderable.
 */
export function useDensityLevel(explicit?: DensityLevel): DensityLevel {
	const ambient = useDensityStep()

	return explicit ?? sizeToDensityLevel[toAmbientStep(ambient)]
}
