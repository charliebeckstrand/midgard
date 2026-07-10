'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardHandle}. @internal */
export type DashboardHandleProps = {
	/** dnd-kit's activator attributes — role, tab stop, described-by instructions. */
	attributes?: DraggableAttributes
	/** dnd-kit's activator listeners; the whole tile drags from this button alone. */
	listeners?: DraggableSyntheticListeners
	/** Registers this button as the drag activator for focus restoration and measuring. */
	setActivatorNodeRef?: (element: HTMLElement | null) => void
	/** The accessible name — the keyboard path's label for the whole move gesture. */
	label: string
	/**
	 * Chip the handle onto the tile's top-leading corner on its own small
	 * surface — the fallback posture for content that never adopts the inline
	 * handle a chart header renders.
	 * @defaultValue false
	 */
	floating?: boolean
}

/**
 * The grip a tile drags by in editing mode: a real button, so the keyboard
 * sensor lifts it with Space or Enter and the arrows walk it cell by cell.
 * The dashboard mints one per tile and broadcasts it through the ambient
 * `DragHandleContext`; a chart header adopts and claims it, anything else
 * gets this same button floated onto the tile's corner. Listeners bind here
 * and nowhere else — the tile's content keeps every pointer affordance of
 * its own. Minted without wiring, it renders the decorative clone the drag
 * overlay wears: the same grip, held in place so the header never reflows
 * mid-drag, offering no gesture of its own.
 *
 * @internal
 */
export function DashboardHandle({
	attributes,
	listeners,
	setActivatorNodeRef,
	label,
	floating = false,
}: DashboardHandleProps) {
	const inert = listeners === undefined

	return (
		<button
			type="button"
			ref={setActivatorNodeRef}
			data-slot="dashboard-handle"
			className={cn(k.handle({ floating, inert }))}
			{...(inert ? { 'aria-hidden': true, tabIndex: -1 } : { 'aria-label': label })}
			{...attributes}
			{...listeners}
		>
			<Icon icon={<GripVertical />} size="sm" />
		</button>
	)
}
