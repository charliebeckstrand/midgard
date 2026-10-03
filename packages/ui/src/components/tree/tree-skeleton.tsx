import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/tree'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/**
 * The depth of each row, in turn. A row goes at most one level deeper than
 * the row above it, as in a real tree, and the pattern returns to the top
 * level each fourth row.
 */
const DEPTHS = [0, 1, 2, 1] as const

/** Props for {@link TreeSkeleton}: the row count and the explicit props of the tree that change its box. */
export type TreeSkeletonProps = {
	/**
	 * Row placeholders to render.
	 * @defaultValue 5
	 */
	rows?: number
	/**
	 * The density step of the tree it stands in for. Omit it to take the step
	 * of the nearest density scope, as the tree does. A step makes the
	 * silhouette a density scope.
	 */
	size?: DensityStep
	/**
	 * Indents each nested row by the chevron width plus the row gap, as the
	 * tree does.
	 * @defaultValue true
	 */
	indent?: boolean
	className?: string
}

/**
 * Tree-shaped placeholder: `rows` rows of an icon and a label line. The rows
 * go to a depth from a fixed pattern, so the silhouette shows nested
 * branches. Keyed off the row count, so it does not use the size-driven
 * `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. Each row has the
 * box of a real row: the same padding, gap, and chevron column, and a label
 * line with the line height of the row text. A spacer of one chevron column
 * per depth level stands in for the indent of a nested group. The row height
 * and the indent follow the nearest density scope, as the tree does.
 * @see {@link Tree}
 */
export function TreeSkeleton({ rows = 5, size, indent = true, className }: TreeSkeletonProps) {
	const rowKeys = rangeKeys(rows, 'row')

	const depthOf = (index: number) => DEPTHS[index % DEPTHS.length] ?? 0

	// The tree trims the outer padding of its first and last top-level items.
	const lastTopLevel = rowKeys.findLastIndex((_, index) => depthOf(index) === 0)

	return (
		<div data-density={size} aria-hidden="true" className={cn(k.base, className)}>
			{rowKeys.map((rowKey, index) => (
				<div
					key={rowKey}
					className={cn(
						k.skeleton.row,
						index === 0 && k.skeleton.first,
						index === lastTopLevel && k.skeleton.last,
					)}
				>
					{indent
						? rangeKeys(depthOf(index), 'indent').map((indentKey) => (
								<span key={indentKey} className={cn(k.chevron)} />
							))
						: null}
					<span className={cn(k.chevron)} />
					<Placeholder className={cn(k.skeleton.icon)} />
					<Placeholder
						className={cn(k.skeleton.label, k.skeleton.labels[index % k.skeleton.labels.length])}
					/>
				</div>
			))}
		</div>
	)
}
