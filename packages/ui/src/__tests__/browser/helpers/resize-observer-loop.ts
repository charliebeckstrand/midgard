import { onTestFinished } from 'vitest'

/**
 * Records each "ResizeObserver loop" error on `window` until the test finishes.
 *
 * The browser fires that error when an observer callback changes a size that
 * another observer watches, and the frame ends with notifications that it did
 * not deliver. The listener comes off in `onTestFinished`, so it also comes off
 * after a case that fails or times out.
 *
 * @returns The messages, in order. The array fills while the case runs.
 */
export function resizeObserverLoopErrors(): string[] {
	const errors: string[] = []

	const record = (event: ErrorEvent) => {
		if (event.message.includes('ResizeObserver loop')) errors.push(event.message)
	}

	window.addEventListener('error', record)

	onTestFinished(() => window.removeEventListener('error', record))

	return errors
}

/**
 * Runs `step` in the next animation frame callback.
 *
 * The frame lays out and delivers its `ResizeObserver` notifications after the
 * callback, and no task runs between. Thus a step here lands in the frame of
 * the next observer tick.
 *
 * @param step - The change to make in the frame.
 */
export function inFrame(step: () => void): Promise<void> {
	return new Promise((resolve) =>
		requestAnimationFrame(() => {
			step()

			resolve()
		}),
	)
}
