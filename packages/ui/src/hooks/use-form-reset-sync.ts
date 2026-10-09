'use client'

import { type RefObject, useEffect } from 'react'
import { useStableEvent } from './use-stable-event'

/**
 * Mirrors a native `reset` of the enclosing `<form>` into the state of a
 * component.
 *
 * A native form reset reverts an uncontrolled input and does not fire
 * `onChange`. The browser reverts the input after the `reset` event, so the hook
 * calls `onReset` with the input on the next frame. The component then reads
 * the reverted value from the input. Unmount, or a change of `enabled` to
 * `false`, removes the listener and cancels a waiting frame.
 *
 * @param inputRef The input that the form reverts.
 * @param enabled Listens only when `true`. Give `false` when React controls the input.
 * @param onReset Receives the reverted input. It can change on each render.
 * @internal
 */
export function useFormResetSync(
	inputRef: RefObject<HTMLInputElement | null>,
	enabled: boolean,
	onReset: (input: HTMLInputElement) => void,
): void {
	const handle = useStableEvent(onReset)

	useEffect(() => {
		if (!enabled) return

		const input = inputRef.current

		const form = input?.form

		if (!input || !form) return

		let frame = 0

		const handleReset = () => {
			frame = requestAnimationFrame(() => handle(input))
		}

		form.addEventListener('reset', handleReset)

		return () => {
			form.removeEventListener('reset', handleReset)

			cancelAnimationFrame(frame)
		}
	}, [enabled, inputRef, handle])
}
