'use client'

import {
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	PointerSensor,
	type PointerSensorOptions,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer sensor that activates a drag only on a genuine primary press.
 *
 * dnd-kit's stock {@link PointerSensor} filters the secondary button
 * (`button !== 0`) but not a Ctrl-click — which on macOS *is* the secondary
 * click and fires `contextmenu`. Left unfiltered, that press starts a drag
 * whose `pointerup` the opening context menu swallows, stranding the item
 * mid-drag as if it were still held. Rejecting `ctrlKey` (alongside the
 * non-primary buttons the stock sensor already drops) keeps any context-menu
 * gesture from ever beginning a drag.
 *
 * @internal
 */
class PrimaryPointerSensor extends PointerSensor {
	static activators: typeof PointerSensor.activators = [
		{
			eventName: 'onPointerDown',
			handler: (
				{ nativeEvent: event }: ReactPointerEvent,
				{ onActivation }: PointerSensorOptions,
			) => {
				if (!event.isPrimary || event.button !== 0 || event.ctrlKey) return false

				onActivation?.({ event })

				return true
			},
		},
	]
}

type SortableSensorsOptions = {
	/** Pointer travel distance (px) before a drag activates. @defaultValue 3 */
	activationDistance?: number
	/** Include dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. @defaultValue true */
	keyboard?: boolean
	/**
	 * Coordinate getter driving the keyboard sensor's arrow-key reordering.
	 * Override to scope arrow steps when a single `DndContext` hosts more than one
	 * sortable (e.g. the group manager, whose group and column droppables share a
	 * context); the default weighs every droppable in the context.
	 *
	 * @defaultValue `sortableKeyboardCoordinates`
	 */
	keyboardCoordinateGetter?: KeyboardCoordinateGetter
}

/**
 * Standard sensor configuration for dnd-kit powered sortable UIs.
 * Pairs a low-threshold {@link PrimaryPointerSensor} (which ignores
 * context-menu presses, including the macOS Ctrl-click) with a keyboard sensor
 * using `sortableKeyboardCoordinates` for arrow-key reordering.
 *
 * @returns dnd-kit's `SensorDescriptor[]` to pass to `<DndContext sensors>`;
 * the keyboard sensor is omitted when `keyboard` is false.
 */
export function useSortableSensors({
	activationDistance = 3,
	keyboard = true,
	keyboardCoordinateGetter = sortableKeyboardCoordinates,
}: SortableSensorsOptions = {}) {
	const pointer = useSensor(PrimaryPointerSensor, {
		activationConstraint: { distance: activationDistance },
	})

	const keyboardSensor = useSensor(KeyboardSensor, {
		coordinateGetter: keyboardCoordinateGetter,
	})

	return useSensors(pointer, keyboard ? keyboardSensor : null)
}
