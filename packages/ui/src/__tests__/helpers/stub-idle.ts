import { vi } from 'vitest'

/**
 * Stubs `requestIdleCallback` and `cancelIdleCallback` on the window. No idle
 * callback runs until the test calls `run`.
 *
 * @remarks
 * The stubs go through `vi.stubGlobal`, so the setups revert them after each
 * test. A test that never calls `run` holds each idle callback.
 *
 * @returns
 * - `request`: the stub of `requestIdleCallback`. Each call gives a new handle.
 * - `cancel`: the stub of `cancelIdleCallback`. It drops the callback of the
 *   handle.
 * - `run`: calls each idle callback that is scheduled now, one time.
 */
export function stubIdle() {
	const callbacks = new Map<number, () => void>()

	let next = 1

	const request = vi.fn((callback: () => void) => {
		callbacks.set(next, callback)

		return next++
	})

	const cancel = vi.fn((handle: number) => {
		callbacks.delete(handle)
	})

	vi.stubGlobal('requestIdleCallback', request)

	vi.stubGlobal('cancelIdleCallback', cancel)

	const run = () => {
		const due = [...callbacks.values()]

		callbacks.clear()

		for (const callback of due) callback()
	}

	return { request, cancel, run }
}
