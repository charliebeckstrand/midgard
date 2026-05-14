'use client'

import { createContext } from '../../core'

export type DensityTier = 'comfortable' | 'snug' | 'compact'

/**
 * Ambient density tier — provided by `<Density>`. Maps 1:1 to the Concentric
 * size cascade (`comfortable` → `lg`, `snug` → `md`, `compact` → `sm`), which
 * `<Density>` broadcasts alongside this context so every size-aware
 * descendant inherits without further wiring. See `src/docs/CASCADES.md`.
 *
 * Defaults to `'snug'` (equivalent to `size: 'md'`) outside any provider.
 */
export const [DensityProvider, useDensity] = createContext<DensityTier>('Density', {
	default: 'snug',
})
