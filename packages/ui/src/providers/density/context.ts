import type { Step } from '../../recipes'

/** Friendly density level a `<DensityProvider>` broadcasts; `'snug'` is the baseline. */
export type DensityLevel = 'loose' | 'snug' | 'compact'

/**
 * Selectable density levels with display labels, ordered loose → compact, for
 * use in density pickers.
 *
 * @see {@link densityToSize} for the 1:1 mapping of these friendly levels to the `Step` cascade.
 */
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
export const densityToSize = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
} satisfies Record<DensityLevel, Step>

/**
 * `Step` carried by the ambient Density cascade → friendly level, the inverse
 * of {@link densityToSize}. Backs `useDensityLevel`'s ambient fallback for
 * context-reading components whose prop surface speaks `DensityLevel`.
 */
export const sizeToDensityLevel = {
	lg: 'loose',
	md: 'snug',
	sm: 'compact',
} satisfies Record<Step, DensityLevel>
