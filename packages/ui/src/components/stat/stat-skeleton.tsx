import { cn } from '../../core'
import { k, type StatValueVariants } from '../../recipes/kata/stat'
import { StatDeltaSkeleton } from './stat-delta-skeleton'
import { StatDescriptionSkeleton } from './stat-description-skeleton'
import { StatLabelSkeleton } from './stat-label-skeleton'
import { StatValueSkeleton } from './stat-value-skeleton'

/** Props for {@link StatSkeleton}: the value size, the optional slots, and `className`. */
export type StatSkeletonProps = {
	/**
	 * The `size` of the `StatValue` it stands in for.
	 * @defaultValue 'md'
	 */
	size?: NonNullable<StatValueVariants['size']>
	/**
	 * Adds a delta line below the value, for a stat that renders a `StatDelta`.
	 * @defaultValue false
	 */
	delta?: boolean
	/**
	 * Adds a description line at the end, for a stat that renders a
	 * `StatDescription`.
	 * @defaultValue false
	 */
	description?: boolean
	className?: string
}

/**
 * Stat-shaped placeholder: a label line and a value line in the column of a
 * {@link Stat}, with an optional delta line and description line. It puts the
 * slot skeletons in the order of the slots in a `Stat`. For a different order,
 * compose the slot skeletons in a `Stat`.
 *
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Stat}
 */
export function StatSkeleton({
	size,
	delta = false,
	description = false,
	className,
}: StatSkeletonProps) {
	return (
		<div className={cn(k(), className)}>
			<StatLabelSkeleton />
			<StatValueSkeleton size={size} />
			{delta ? <StatDeltaSkeleton /> : null}
			{description ? <StatDescriptionSkeleton /> : null}
		</div>
	)
}
