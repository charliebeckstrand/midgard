'use client'

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

type SortableSensorsOptions = {
	/** Pointer travel distance (px) before a drag activates. @default 3 */
	activationDistance?: number
	/** Include dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. @default true */
	keyboard?: boolean
}

/**
 * Standard sensor configuration for dnd-kit powered sortable UIs.
 * Pairs a low-threshold pointer sensor with a keyboard sensor using
 * `sortableKeyboardCoordinates` for arrow-key reordering.
 */
export function useSortableSensors({
	activationDistance = 3,
	keyboard = true,
}: SortableSensorsOptions = {}) {
	const pointer = useSensor(PointerSensor, {
		activationConstraint: { distance: activationDistance },
	})

	const keyboardSensor = useSensor(KeyboardSensor, {
		coordinateGetter: sortableKeyboardCoordinates,
	})

	return useSensors(pointer, keyboard ? keyboardSensor : null)
}
