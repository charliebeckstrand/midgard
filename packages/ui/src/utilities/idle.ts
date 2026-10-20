/**
 * Calls `callback` in idle time. A browser with no `requestIdleCallback`, such
 * as Safari, calls it after `fallbackDelay` milliseconds, with no deadline.
 *
 * @returns The handle that {@link cancelIdle} takes.
 * @internal
 */
export function requestIdle(
	callback: (deadline?: IdleDeadline) => void,
	fallbackDelay: number,
): number {
	const idle =
		window.requestIdleCallback ?? ((call: () => void) => window.setTimeout(call, fallbackDelay))

	return idle(callback)
}

/** Cancels a callback that {@link requestIdle} scheduled. @internal */
export function cancelIdle(handle: number): void {
	const cancel = window.cancelIdleCallback ?? window.clearTimeout

	cancel(handle)
}
