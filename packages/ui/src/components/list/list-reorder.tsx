'use client'

import { domMax, LazyMotion, Reorder } from 'motion/react'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import { createContext } from '../../core'
import type { ListItemContextValue } from './context'

/** The move of a row under reduced motion: no animation. */
const INSTANT = { duration: 0 }

/** The `<ul>` of the group, which holds a dragged row inside its box. */
const [GroupBoxContext, useGroupBox] =
	createContext<RefObject<HTMLUListElement | null>>('ListReorderBox')

type ListReorderGroupProps = Omit<
	ComponentProps<'ul'>,
	'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
	axis: 'x' | 'y'
	/** The keys of the rows, in their current order. */
	values: string[]
	/** Called with the new order of keys while a row moves under the pointer. */
	onReorder: (order: string[]) => void
	/** The `<ul>`, which also bounds the drag of each row. */
	ref: RefObject<HTMLUListElement | null>
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
function ListReorderGroup({ ref, ...props }: ListReorderGroupProps) {
	return (
		<LazyMotion features={domMax}>
			<GroupBoxContext value={ref}>
				<Reorder.Group {...props} ref={ref} as="ul" />
			</GroupBoxContext>
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
 *
 * The box of the list bounds the drag, with no give at the edges. A row does
 * not go over the content around the list, because it cannot move to a place
 * outside the list.
 */
function ListReorderRow({ id, reorder, ...row }: ListReorderRowProps) {
	const box = useGroupBox()

	return (
		<Reorder.Item
			{...row}
			as="li"
			value={id}
			dragListener={false}
			dragControls={reorder.controls}
			dragConstraints={box}
			dragElastic={0}
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
