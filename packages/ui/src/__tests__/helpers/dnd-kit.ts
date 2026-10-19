import { act } from '@testing-library/react'
import { tick } from './frames'

/** The time after which a pointer sensor of dnd-kit removes its document listeners. */
const POINTER_DETACH_MS = 50

/**
 * Waits until the keyboard sensor of dnd-kit listens for keys. The sensor adds
 * its key listener one timer after a lift, so a key that comes before that
 * timer moves nothing.
 */
export function keyboardSensorAttached(): Promise<void> {
	return act(tick)
}

/**
 * Waits until a pointer sensor of dnd-kit removes its document listeners. The
 * sensor removes them 50 ms after a release. Until then, its click guard on
 * the document stops the next click, also in the next case.
 */
export function pointerSensorDetached(): Promise<void> {
	return act(
		() =>
			new Promise<void>((resolve) => {
				setTimeout(resolve, POINTER_DETACH_MS)
			}),
	)
}
