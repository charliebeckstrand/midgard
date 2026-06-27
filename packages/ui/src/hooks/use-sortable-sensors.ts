'use client'

import {
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
}: SortableSensorsOptions = {}) {
	const pointer = useSensor(PrimaryPointerSensor, {
		activationConstraint: { distance: activationDistance },
	})

	const keyboardSensor = useSensor(KeyboardSensor, {
		coordinateGetter: sortableKeyboardCoordinates,
	})

	return useSensors(pointer, keyboard ? keyboardSensor : null)
}
