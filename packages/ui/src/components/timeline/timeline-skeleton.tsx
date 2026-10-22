import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'
import type { TimelineOrientation } from './context'

/** Props for {@link TimelineSkeleton}: the item count and the `orientation` of the timeline. */
export type TimelineSkeletonProps = {
	/**
	 * Item placeholders to render.
	 * @defaultValue 3
	 */
	items?: number
	/**
	 * The layout axis of the timeline it stands in for.
	 * @defaultValue 'vertical'
	 */
	orientation?: TimelineOrientation
	className?: string
}

/**
 * A placeholder for a Timeline while it loads. It holds `items` rows, each with
 * a marker dot on the real connector rail, a title line, and a timestamp line.
 * The root, the items, the marker, and the place of each line come from the
 * timeline recipes, so each orientation matches the real timeline. Keyed off
 * the item count, so it does not use the size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The item spacing
 * follows the nearest density scope, as the items of the timeline do. The
 * `variant` of a timeline does not change its box, so the skeleton does not
 * take it. The list is `aria-hidden`, so assistive technology does not find a
 * list of empty items.
 * @see {@link Timeline}
 */
export function TimelineSkeleton({
	items = 3,
	orientation = 'vertical',
	className,
}: TimelineSkeletonProps) {
	const itemKeys = rangeKeys(items, 'item')

	const slots = k({ orientation })

	return (
		<ol aria-hidden="true" className={cn(slots.base, className)}>
			{itemKeys.map((itemKey) => (
				<li key={itemKey} className={slots.item}>
					<span className={slots.marker.base}>
						<Placeholder as="span" className={cn(slots.marker.dot, k.skeleton.dot)} />
					</span>
					<Placeholder className={cn(slots.title, k.skeleton.title)} />
					<Placeholder className={cn(slots.timestamp, k.skeleton.timestamp)} />
				</li>
			))}
		</ol>
	)
}
