'use client'

import { domMax, frame, LazyMotion, Reorder } from 'motion/react'
import {
	type ComponentProps,
	type ReactNode,
	type Ref,
	type RefObject,
	useLayoutEffect,
	useRef,
} from 'react'
import { createContext } from '../../core/create-context'
import { k } from '../../recipes/kata/list'
import type { ListItemContextValue } from './context'

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

/**
 * Gives the node of a row to `ref`, and again to each new `ref`. Motion keeps
 * the ref of the first render of a `Reorder.Item`, so a ref that changes later
 * never gets the node. The tooltip of the row changes its ref when its state
 * takes over the row, and its hover then opened no tooltip. The row therefore
 * gives Motion a ref object that does not change, and this hook attaches the
 * node to `ref` as React does: a callback ref that returns a cleanup gets the
 * cleanup on detach, and any other callback ref gets `null`.
 *
 * @internal
 */
function useRowRef(rowRef: RefObject<HTMLLIElement | null>, ref: Ref<HTMLLIElement> | undefined) {
	// A layout effect of the row runs after React attaches the ref of the `<li>`
	// in the same commit, and before the layout effects of each ancestor.
	useLayoutEffect(() => {
		const node = rowRef.current

		if (!node || !ref) return

		if (typeof ref !== 'function') {
			ref.current = node

			return () => {
				ref.current = null
			}
		}

		const cleanup = ref(node)

		return () => {
			if (typeof cleanup === 'function') cleanup()
			else ref(null)
		}
	}, [rowRef, ref])
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
 *
 * A keyboard move keeps the focus on the row, so the browser does not scroll
 * the row into view. When the move of a row that holds the focus comes to its
 * end, the row scrolls into view, such as in the rail of a horizontal list. The
 * scroll waits until Motion renders that end, because until then a transform
 * keeps the row at its old place.
 */
function ListReorderRow({ id, reorder, ref, ...row }: ListReorderRowProps) {
	const box = useGroupBox()

	const rowRef = useRef<HTMLLIElement>(null)

	useRowRef(rowRef, ref)

	return (
		<Reorder.Item
			{...row}
			ref={rowRef}
			as="li"
			value={id}
			dragListener={false}
			dragControls={reorder.controls}
			dragConstraints={box}
			dragElastic={0}
			transition={reorder.instant ? k.instant : undefined}
			onDragStart={reorder.onDragStart}
			onDragEnd={reorder.onDragEnd}
			onLayoutAnimationComplete={() => {
				// After the render of this frame, which takes the transform off the row.
				frame.postRender(() => {
					const node = rowRef.current

					if (node?.contains(document.activeElement))
						node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
				})
			}}
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
