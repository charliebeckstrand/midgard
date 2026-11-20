import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** The time after which a pointer sensor of dnd-kit removes its document listeners. */
const POINTER_DETACH_MS = 50

/**
 * Waits until a timer of a dnd-kit sensor runs, in `act`. The sensor starts its
 * timer on the clock that is on. On the fake clock, the wait moves that clock
 * by `ms`, because no other code moves it. On the real clock, it waits `ms`.
 */
function sensorTimer(ms: number): Promise<void> {
	if (vi.isFakeTimers()) {
		return act(async () => {
			await vi.advanceTimersByTimeAsync(ms)
		})
	}

	return act(
		() =>
			new Promise<void>((resolve) => {
				setTimeout(resolve, ms)
			}),
	)
}

/**
 * Waits until the keyboard sensor of dnd-kit listens for keys. The sensor adds
 * its key listener one timer after a lift, so a key that comes before that
 * timer moves nothing.
 */
export function keyboardSensorAttached(): Promise<void> {
	return sensorTimer(0)
}

/**
 * Waits until a pointer sensor of dnd-kit removes its document listeners. The
 * sensor removes them 50 ms after a release. Until then, its click guard on
 * the document stops the next click, also in the next case.
 */
export function pointerSensorDetached(): Promise<void> {
	return sensorTimer(POINTER_DETACH_MS)
}
