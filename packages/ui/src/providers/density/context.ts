import type { Step } from '../../recipes'

export type DensityLevel = 'loose' | 'snug' | 'compact'

/** @see `densityToSize` for the 1:1 mapping of these friendly levels to the `Step` cascade. */
export const densityLevels: { label: string; value: DensityLevel }[] = [
	{ label: 'Loose', value: 'loose' },
	{ label: 'Snug', value: 'snug' },
	{ label: 'Compact', value: 'compact' },
]

/**
 * Friendly density level → `Step` carried by the Density primitive, broadcast
 * by `<DensityProvider>`. 1:1 mapping (`loose` → `lg`, `snug` → `md`,
 * `compact` → `sm`); `snug` / `md` is the baseline outside any provider.
 */
export const densityToSize: Record<DensityLevel, Step> = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
}
