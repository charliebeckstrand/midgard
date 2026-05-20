'use client'

import { createContext } from '../../core'
import type { Step } from '../../core/recipe'

export type DensityLevel = 'loose' | 'snug' | 'compact'

/** Friendly density level → `Step` carried by the Density primitive. 1:1 mapping. */
export const densityToSize: Record<DensityLevel, Step> = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
}

/**
 * Friendly ambient density level — provided by `<Density>`. Maps 1:1 to the
 * `Step` cascade carried by the Density primitive (`loose` → `lg`,
 * `snug` → `md`, `compact` → `sm`), which `<Density>` broadcasts alongside
 * this context so every size-aware descendant inherits without further
 * wiring.
 *
 * Defaults to `'snug'` (equivalent to `size: 'md'`) outside any provider.
 */
export const [DensityProvider, useDensity] = createContext<DensityLevel>('Density', {
	default: 'snug',
})
