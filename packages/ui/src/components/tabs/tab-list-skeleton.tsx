import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/tabs'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link TabListSkeleton}. */
export type TabListSkeletonProps = {
	/**
	 * Tab line placeholders to render.
	 * @defaultValue 3
	 */
	tabs?: number
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the tabs do. A step makes the silhouette a density scope.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Tab-list-shaped placeholder: the horizontal list rail holding `tabs` line
 * placeholders as a row. Keyed off the tab count rather than a size step
 * alone; it does not use the size-driven `createSkeleton` factory.
 */
export function TabListSkeleton({ tabs = 3, size, className }: TabListSkeletonProps) {
	const tabKeys = rangeKeys(tabs, 'tab')

	return (
		<div data-density={size} className={cn(k.list({ orientation: 'horizontal' }), className)}>
			{tabKeys.map((tabKey) => (
				<Placeholder key={tabKey} className={k.skeleton.tab} />
			))}
		</div>
	)
}
