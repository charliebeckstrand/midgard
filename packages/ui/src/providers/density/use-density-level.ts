'use client'

import { toAmbientStep } from '../../core/density'
import { useDensityStep } from '../../primitives/density'
import { type DensityLevel, sizeToDensityLevel } from './context'

/**
 * Resolves a friendly `DensityLevel`: the explicit level, else the level of
 * the ambient step that `useDensityStep` resolves (the nearest scope, else the
 * root element, else `md`, which is `'snug'`). For a client component whose
 * prop surface speaks `DensityLevel` rather than the primitive `Step`. It must still inherit an enclosing `<DensityProvider>` when
 * the prop is omitted. {@link Grid} is one: it projects density onto a `Table`
 * that itself reads no context (REFERENCE.md §2).
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
