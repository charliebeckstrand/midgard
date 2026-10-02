import { cn } from '../../core'
import { k, type ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link ListSkeleton}: the row count, the explicit props of the list, and the description line. */
export type ListSkeletonProps = {
	/**
	 * Row placeholders to render.
	 * @defaultValue 3
	 */
	items?: number
	/**
	 * The variant of the list it stands in for. The rows take its chrome.
	 * @defaultValue 'separated'
	 */
	variant?: ListVariant
	/**
	 * The layout axis of the list it stands in for.
	 * @defaultValue 'vertical'
	 */
	orientation?: Orientation
	/**
	 * Adds a description line below the label line of each row, for rows
	 * that render a `ListDescription`.
	 * @defaultValue false
	 */
	description?: boolean
	className?: string
}

/**
 * List-shaped placeholder: `items` rows in the chrome of the `variant`, each
 * with a label line and an optional description line. Keyed off the row count,
 * so it does not use the size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The row padding
 * follows the nearest density scope, as the rows of the list do.
 * @see {@link List}
 */
export function ListSkeleton({
	items = 3,
	variant,
	orientation,
	description = false,
	className,
}: ListSkeletonProps) {
	const rowKeys = rangeKeys(items, 'row')

	return (
		<div className={cn(k.root({ variant, orientation }), className)}>
			{rowKeys.map((rowKey) => (
				<div key={rowKey} className={k.item({ variant })}>
					<div className={k.content()}>
						<Placeholder className={k.skeleton.label} />
						{description ? <Placeholder className={k.skeleton.description} /> : null}
					</div>
				</div>
			))}
		</div>
	)
}
