import type { InnerStep } from '../../core/density'

/**
 * A friendly density level: the stored density setting, and the `density` prop
 * of `<DensityProvider>`. `'snug'` is the baseline.
 */
export type DensityLevel = 'loose' | 'snug' | 'compact'

/**
 * Selectable density levels with display labels, ordered loose → compact, for
 * use in density pickers.
 *
 * @see {@link densityToSize} for the step of each level.
 */
export const densityLevels: { label: string; value: DensityLevel }[] = [
	{ label: 'Loose', value: 'loose' },
	{ label: 'Snug', value: 'snug' },
	{ label: 'Compact', value: 'compact' },
]

/**
 * The density step of each friendly level: `loose` → `lg`, `snug` → `md`, and
 * `compact` → `sm`. The `md` step applies where no scope and no root step set
 * one.
 */
export const densityToSize = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
} satisfies Record<DensityLevel, InnerStep>

/**
 * The friendly level of each ambient step, the inverse of {@link densityToSize}.
 * `useDensityLevel` uses it to give the level of the step that it resolves.
 */
export const sizeToDensityLevel = {
	lg: 'loose',
	md: 'snug',
	sm: 'compact',
} satisfies Record<InnerStep, DensityLevel>
