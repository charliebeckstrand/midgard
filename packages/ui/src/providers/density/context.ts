'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes/ryu/sun'

export type DensityLevel = 'comfortable' | 'snug' | 'compact'

/** Density → Concentric size. The two cascades are 1:1. */
export const DENSITY_TO_SIZE: Record<DensityLevel, Step> = {
	comfortable: 'lg',
	snug: 'md',
	compact: 'sm',
}

/** Reverse of {@link DENSITY_TO_SIZE} — translate an ambient Concentric size back into a density level. */
export const SIZE_TO_DENSITY: Record<Step, DensityLevel> = {
	sm: 'compact',
	md: 'snug',
	lg: 'comfortable',
}

/**
 * Ambient density level — provided by `<Density>`. Maps 1:1 to the Concentric
 * size cascade (`comfortable` → `lg`, `snug` → `md`, `compact` → `sm`), which
 * `<Density>` broadcasts alongside this context so every size-aware
 * descendant inherits without further wiring. See `src/docs/CASCADES.md`.
 *
 * Defaults to `'snug'` (equivalent to `size: 'md'`) outside any provider.
 */
export const [DensityProvider, useDensity] = createContext<DensityLevel>('Density', {
	default: 'snug',
})
