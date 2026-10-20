'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type CSSProperties, useMemo } from 'react'
import { reorderMessages } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** Options for {@link useSortableItem}: the item's id and whether it takes a drag. */
export type SortableItemOptions = {
	/** Stable id matching the enclosing `SortableContext` items array. */
	id: string
	/** Disable pointer + keyboard interaction for this item. @defaultValue false */
	disabled?: boolean
}

/**
 * Wraps dnd-kit's `useSortable` for each sortable item in this package. The
 * item's role description is in the language of the reader. When the reader
 * asks for reduced motion, `transition` is `undefined`, so a displaced item
 * moves to its new slot at once (WCAG 2.3.3).
 *
 * `style` is the standard style of an item whose dragged visual a
 * `<DragOverlay>` draws: a translate via `CSS.Translate.toString`, the
 * transition, and a hidden opacity while dragging. The style has no scale, so
 * an item moves and does not change its size. An item that stays visible
 * while it moves composes its own style from `transform` and `transition`.
 *
 * @remarks
 * dnd-kit writes its reflow transition (`transform 200ms ease`) as an inline
 * style, and an inline style beats a `motion-reduce:` class. So under reduced
 * motion the hook gives dnd-kit `transition: null` instead.
 *
 * @returns `{ setNodeRef, setActivatorNodeRef, attributes, listeners,
 * transform, transition, style, dragging, sorting }`: dnd-kit's node and
 * activator refs, the spreadable `attributes` and `listeners`, the raw
 * `transform` and `transition`, the composed `style`, `dragging` for the
 * active item, and `sorting` while any item of the list drags. `style` keeps
 * its identity while its transform, transition, and drag state hold.
 */
export function useSortableItem({ id, disabled = false }: SortableItemOptions) {
	const still = usePrefersReducedMotion()

	const intl = useIntl()

	const role = { roleDescription: intl.formatMessage(reorderMessages.sortableRole) }

	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging: dragging,
		isSorting: sorting,
	} = useSortable(
		still
			? { id, disabled, attributes: role, transition: null }
			: { id, disabled, attributes: role },
	)

	// dnd-kit renders each sortable item again when the item under the pointer
	// changes. The style keeps its identity while its values hold, so a memoized
	// consumer of an item that did not move holds too.
	const translate = CSS.Translate.toString(transform)

	const style = useMemo<CSSProperties>(
		() => ({ transform: translate, transition, opacity: dragging ? 0 : 1 }),
		[translate, transition, dragging],
	)

	return {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		style,
		dragging,
		sorting,
	}
}
