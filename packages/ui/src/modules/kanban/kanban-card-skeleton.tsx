import { Card } from '../../components/card'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'

/** Props for {@link KanbanCardSkeleton}: `className` only. */
export type KanbanCardSkeletonProps = {
	className?: string
}

/**
 * Card-shaped placeholder for a {@link KanbanColumnBody}: the box of a real
 * card with two lines in it. Render one for each card that loads, in a real
 * column. To show a lane title that loads, put an inline `HeadingSkeleton` in
 * a real {@link KanbanColumnTitle}, as in a `CardTitle`.
 *
 * @remarks Static leaf: renders in React Server Components. The skeleton is a
 * `Card` with the classes of the real card, so it has the padding, gap, and
 * chrome of the real card. A real card holds free content, so the two lines
 * are a default form. The skeleton is an `aria-hidden` `<li>`, as a real card
 * is a `<li>`, because the body of a column with cards is a `<ul>`. A body that
 * holds only skeletons hides that list from AT.
 * @see {@link KanbanCard}
 */
export function KanbanCardSkeleton({ className }: KanbanCardSkeletonProps) {
	return (
		<li aria-hidden="true">
			<Card bg="surface" className={cn(k.card.base, className)}>
				<div className={cn(k.card.content)}>
					<Placeholder className={k.skeleton.line} />
					<Placeholder className={k.skeleton.meta} />
				</div>
			</Card>
		</li>
	)
}
