'use client'

import { type RefCallback, useCallback } from 'react'
import { useStableEvent } from './use-stable-event'

/**
 * Mirrors a native `reset` of the enclosing `<form>` into the state of a
 * component.
 *
 * A native form reset reverts an uncontrolled input and does not fire
 * `onChange`. The browser reverts the input after the `reset` event, so the hook
 * calls `onReset` with the input on the next frame. The component then reads
 * the reverted value from the input, or sets its own state back to its seed.
 * A canceled reset does not call `onReset`.
 *
 * The hook returns a callback ref. Put it on the input, and join it to the
 * other refs of that input through `useComposedRefs`. The ref listens to the
 * form of the input while the input is mounted, so an input that mounts late,
 * or mounts again, gets the listener too. Unmount, or a change of `enabled` to
 * `false`, removes the listener and cancels a waiting frame.
 *
 * @param enabled Listens only when `true`. Give `false` when React controls the value.
 * @param onReset Receives the input after the reset. It can change on each render.
 * @returns A callback ref for the input that the form reverts.
 * @internal
 */
export function useFormResetSync(
	enabled: boolean,
	onReset: (input: HTMLInputElement) => void,
): RefCallback<HTMLInputElement> {
	const handle = useStableEvent(onReset)

	return useCallback(
		(input: HTMLInputElement | null) => {
			const form = input?.form

			if (!enabled || !input || !form) return

			let frame = 0

			// A handler after this one can cancel the reset, as `Form` does. The frame
			// reads the result, because a canceled reset reverts nothing.
			const handleReset = (event: Event) => {
				frame = requestAnimationFrame(() => {
					if (!event.defaultPrevented) handle(input)
				})
			}

			form.addEventListener('reset', handleReset)

			return () => {
				form.removeEventListener('reset', handleReset)

				cancelAnimationFrame(frame)
			}
		},
		[enabled, handle],
	)
}
