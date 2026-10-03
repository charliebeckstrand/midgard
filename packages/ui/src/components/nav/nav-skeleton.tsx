import { cn } from '../../core'
import { k } from '../../recipes/kata/nav'
import type { Orientation } from '../../types'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link NavSkeleton}: the row count and the `orientation` of the list. */
export type NavSkeletonProps = {
	/**
	 * Item rows to render.
	 * @defaultValue 3
	 */
	items?: number
	/**
	 * The layout axis of the `NavList` it stands in for.
	 * @defaultValue 'vertical'
	 */
	orientation?: Orientation
	className?: string
}

/**
 * Nav-list-shaped placeholder: `items` rows on the axis of the
 * `orientation`, each with an icon square and a label line in the box of a
 * `NavItem`. Keyed off the row count, so it does not use the size-driven
 * `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The row box
 * follows the nearest density scope, as the items do. A `NavList` in a
 * `NavBar` is horizontal, so pass `orientation="horizontal"` there.
 * @see {@link NavItem}
 */
export function NavSkeleton({ items = 3, orientation = 'vertical', className }: NavSkeletonProps) {
	const rowKeys = rangeKeys(items, 'row')

	return (
		<div className={cn(k.list.base, k.list.orientation[orientation], className)}>
			{rowKeys.map((rowKey) => (
				<div key={rowKey} className={k.item.base()}>
					<div className={cn(k.item.box)}>
						<Placeholder className={cn(k.skeleton.icon)} />
						<Placeholder className={k.skeleton.label} />
					</div>
				</div>
			))}
		</div>
	)
}
