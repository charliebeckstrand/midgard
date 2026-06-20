import { cn } from '../../core'
import type { Step } from '../../recipes'
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
	 * Size step driving placeholder dimensions.
	 * @defaultValue 'md'
	 */
	size?: Step
	className?: string
}

/**
 * Tab-list-shaped placeholder: the horizontal list rail with `tabs` line
 * placeholders above it. Keyed off the tab count rather than a size step
 * alone; it does not use the size-driven `createSkeleton` factory.
 */
export function TabListSkeleton({ tabs = 3, size, className }: TabListSkeletonProps) {
	const tabKeys = rangeKeys(tabs, 'tab')

	return (
		<div className={cn(k.list({ orientation: 'horizontal' }), className)}>
			{tabKeys.map((tabKey) => (
				<Placeholder
					key={tabKey}
					className={cn(k.skeleton.tab.base, k.skeleton.tab.size[size ?? 'md'])}
				/>
			))}
		</div>
	)
}
