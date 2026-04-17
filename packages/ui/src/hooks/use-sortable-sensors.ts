'use client'

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export type UseSortableSensorsOptions = {
	/** Pointer travel distance (px) before a drag activates. Defaults to 3. */
	activationDistance?: number
}

/**
 * Standard sensor configuration for dnd-kit powered sortable UIs.
 * Pairs a low-threshold pointer sensor with a keyboard sensor using
 * `sortableKeyboardCoordinates` for arrow-key reordering.
 */
export function useSortableSensors({ activationDistance = 3 }: UseSortableSensorsOptions = {}) {
	return useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	)
}
