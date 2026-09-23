'use client'

import { useDensityNullable } from '../../primitives/density'
import { type DensityLevel, sizeToDensityLevel } from './context'

/**
 * Resolves a friendly `DensityLevel`: `explicit ?? ambient ?? 'snug'`. For a
 * client component whose prop surface speaks `DensityLevel` rather than the
 * primitive `Step`. It must still inherit an enclosing `<DensityProvider>` when
 * the prop is omitted. {@link Grid} is one: it projects density onto a `Table`
 * that itself reads no context (REFERENCE.md §2).
 *
 * Reads the ambient token's `space` axis (the padding/gap dimension density
 * here controls), not `size`. The two only diverge under a split
 * `<Density space size>`. `DensityProvider` always sets both together.
 *
 * @remarks Client-only. It has its own `'use client'` file, so the
 * directive-free `DensityProvider` stays server-renderable.
 */
export function useDensityLevel(explicit?: DensityLevel): DensityLevel {
	const ambient = useDensityNullable()

	return explicit ?? (ambient ? sizeToDensityLevel[ambient.space] : 'snug')
}
