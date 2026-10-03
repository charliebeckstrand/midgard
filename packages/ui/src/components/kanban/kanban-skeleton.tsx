import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link KanbanSkeleton}: the column count and the card count of each column. */
export type KanbanSkeletonProps = {
	/**
	 * Column placeholders to render.
	 * @defaultValue 3
	 */
	columns?: number
	/**
	 * Card placeholders to render in each column.
	 * @defaultValue 3
	 */
	cards?: number
	className?: string
}

/**
 * Board-shaped placeholder: `columns` columns, each with a title line in its
 * header and `cards` cards of two lines. Keyed off the column and card
 * counts, so it does not use the size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The board, the
 * columns, the headers, the bodies, and the cards take the classes of the
 * real board, so each box has the width, gap, padding, and chrome of the real
 * box. The board has no size axis, so the silhouette does not follow density.
 * @see {@link Kanban}
 */
export function KanbanSkeleton({ columns = 3, cards = 3, className }: KanbanSkeletonProps) {
	const columnKeys = rangeKeys(columns, 'column')

	const cardKeys = rangeKeys(cards, 'card')

	return (
		<div aria-hidden="true" className={cn(k.base, className)}>
			{columnKeys.map((columnKey) => (
				<div key={columnKey} className={cn(k.column.base)}>
					<div className={cn(k.column.header)}>
						<Placeholder className={k.skeleton.title} />
					</div>
					<div className={cn(k.column.body)}>
						{cardKeys.map((cardKey) => (
							<div key={cardKey} className={cn(k.card.base)}>
								<Placeholder className={k.skeleton.line} />
								<Placeholder className={k.skeleton.meta} />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}
