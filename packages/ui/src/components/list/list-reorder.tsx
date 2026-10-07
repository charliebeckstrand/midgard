'use client'

import { domMax, LazyMotion, Reorder } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'
import type { ListItemContextValue } from './context'

/** The move of a row under reduced motion: no animation. */
const INSTANT = { duration: 0 }

type ListReorderGroupProps = Omit<
	ComponentProps<'ul'>,
	'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
	axis: 'x' | 'y'
	/** The keys of the rows, in their current order. */
	values: string[]
	/** Called with the new order of keys while a row moves under the pointer. */
	onReorder: (order: string[]) => void
	children: ReactNode
}

/**
 * The `<ul>` of a reorderable {@link List}: a Motion `Reorder.Group`.
 *
 * @remarks `Reorder` renders the full `motion` element. A strict `LazyMotion` of
 * a `ReducedMotion` root above the list throws in development, so this
 * `LazyMotion` is not strict. `Reorder` already loads each feature of `domMax`,
 * so the bundle adds no code.
 */
function ListReorderGroup(props: ListReorderGroupProps) {
	return (
		<LazyMotion features={domMax}>
			<Reorder.Group {...props} as="ul" />
		</LazyMotion>
	)
}

type ListReorderRowProps = Omit<
	ComponentProps<'li'>,
	'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
	id: string
	reorder: NonNullable<ListItemContextValue['reorder']>
}

/**
 * The `<li>` of a reorderable row: a Motion `Reorder.Item`. Only the handle
 * starts its drag, through the controls. The content area stays free for a
 * press or a scroll.
 */
function ListReorderRow({ id, reorder, ...row }: ListReorderRowProps) {
	return (
		<Reorder.Item
			{...row}
			as="li"
			value={id}
			dragListener={false}
			dragControls={reorder.controls}
			transition={reorder.instant ? INSTANT : undefined}
			onDragStart={reorder.onDragStart}
			onDragEnd={reorder.onDragEnd}
		/>
	)
}

/**
 * The parts of a reorderable {@link List} that Motion's `Reorder` drives. They
 * are in a module of their own, which `useListReorder` loads when a reorderable
 * list mounts. `Reorder` uses the full `motion` component, so a page with only
 * read-only lists does not load it.
 *
 * @internal
 */
export const ListReorder = { Group: ListReorderGroup, Row: ListReorderRow }

/** The module that {@link ListReorder} is the export of. @internal */
export type ListReorderParts = typeof ListReorder
