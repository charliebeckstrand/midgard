import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/tabs'
import type { Orientation } from '../../types'
import { renderRowSkeleton } from '../placeholder/placeholder-skeleton'

/** Props for {@link TabListSkeleton}. */
export type TabListSkeletonProps = {
	/**
	 * Tab line placeholders to render.
	 * @defaultValue 3
	 */
	tabs?: number
	/**
	 * The orientation of the tabs it stands in for.
	 * @defaultValue 'horizontal'
	 */
	orientation?: Orientation
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the tabs do. A step makes the silhouette a density scope.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Tab-list-shaped placeholder: the list rail of the `orientation`, holding
 * `tabs` line placeholders. Keyed off the tab count rather than a size step
 * alone; it does not use the size-driven `createSkeleton` factory.
 */
export function TabListSkeleton({
	tabs = 3,
	orientation = 'horizontal',
	size,
	className,
}: TabListSkeletonProps) {
	return renderRowSkeleton({
		count: tabs,
		root: [k.list({ orientation }), orientation === 'horizontal' && k.skeleton.gap, className],
		item: k.skeleton.tab[orientation],
		size,
	})
}
