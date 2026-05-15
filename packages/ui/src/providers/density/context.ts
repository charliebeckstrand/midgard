'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes/ryu/sun'

export type DensityLevel = 'loose' | 'snug' | 'compact'

/** Density → Concentric size. The two cascades are 1:1. */
export const DENSITY_TO_SIZE: Record<DensityLevel, Step> = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
}

/**
 * Ambient density level — provided by `<Density>`. Maps 1:1 to the Concentric
 * size cascade (`loose` → `lg`, `snug` → `md`, `compact` → `sm`), which
 * `<Density>` broadcasts alongside this context so every size-aware
 * descendant inherits without further wiring. See `src/docs/CASCADES.md`.
 *
 * Defaults to `'snug'` (equivalent to `size: 'md'`) outside any provider.
 */
export const [DensityProvider, useDensity] = createContext<DensityLevel>('Density', {
	default: 'snug',
})
