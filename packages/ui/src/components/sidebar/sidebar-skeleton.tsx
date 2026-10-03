import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/sidebar'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link SidebarSkeleton}: the row count and an optional `size` step. */
export type SidebarSkeletonProps = {
	/**
	 * Item rows to render.
	 * @defaultValue 5
	 */
	items?: number
	/**
	 * The density step of the rows, as the `size` of a `SidebarItem`. Omit it to
	 * take the step of the nearest density scope, as the items do. A step makes
	 * the silhouette a density scope.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Sidebar-list-shaped placeholder: `items` rows in the stack of a
 * `SidebarList`, each with an icon square and a label line in the box of a
 * `SidebarItem`. Keyed off the row count, so it does not use the size-driven
 * `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The row box
 * follows the nearest density scope, as the items do. Under the mini rail of
 * a `Sidebar`, the label lines hide, as the labels of the items do.
 * @see {@link SidebarItem}
 */
export function SidebarSkeleton({ items = 5, size, className }: SidebarSkeletonProps) {
	const rowKeys = rangeKeys(items, 'row')

	return (
		<div data-density={size} className={cn(k.list, className)}>
			{rowKeys.map((rowKey) => (
				<div key={rowKey} className={k.item.row()}>
					<div className={cn(k.item.box)}>
						<Placeholder className={cn(k.skeleton.icon)} />
						<Placeholder className={cn(k.skeleton.label)} />
					</div>
				</div>
			))}
		</div>
	)
}
