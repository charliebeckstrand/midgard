import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { Placeholder } from '../placeholder'

/** Props for {@link KanbanCardSkeleton}: `className` only. */
export type KanbanCardSkeletonProps = {
	className?: string
}

/**
 * Card-shaped placeholder for a {@link KanbanColumnBody}: the box of a real
 * card with two lines in it. Render one for each card that loads, in a real
 * column. To show a lane title that loads, put a `TextSkeleton` in a real
 * {@link KanbanColumnTitle}.
 *
 * @remarks Static leaf: renders in React Server Components. The card takes the
 * classes of the real card, so it has the padding, gap, and chrome of the real
 * card. A real card holds free content, so the two lines are a default form.
 * The card is `aria-hidden`.
 * @see {@link KanbanCard}
 */
export function KanbanCardSkeleton({ className }: KanbanCardSkeletonProps) {
	return (
		<div aria-hidden="true" className={cn(k.card.base, className)}>
			<Placeholder className={k.skeleton.line} />
			<Placeholder className={k.skeleton.meta} />
		</div>
	)
}
