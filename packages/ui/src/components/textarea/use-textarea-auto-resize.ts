'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'

/**
 * Set the height of a textarea to the height of its content.
 *
 * @remarks The `auto` reset lets the `rows` height be the floor, so the field
 * never gets smaller than `rows` lines. A `max-height` on the element stops the
 * growth, and the field then scrolls. A field without layout, such as a field
 * in a closed panel, keeps its height until it gets a width.
 *
 * @internal
 */
function fitTextarea(textarea: HTMLTextAreaElement): void {
	if (textarea.clientWidth === 0) return

	textarea.style.height = 'auto'

	const style = getComputedStyle(textarea)

	const edge =
		style.boxSizing === 'border-box'
			? Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)
			: -(Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom))

	textarea.style.height = `${textarea.scrollHeight + edge}px`
}

/**
 * Keep the height of a textarea equal to the height of its content while
 * `enabled` is true.
 *
 * @remarks The hook fits the field on each `input` event, and before paint after
 * a render that changed its text, such as a controlled write, which sends no
 * `input` event. It also fits the field when its width changes, because a new
 * width changes the line wraps. The resize observer defers the fit by one
 * frame, so the height write does not start a resize-observer loop. When
 * `enabled` becomes false, the hook removes the inline height.
 *
 * The hook sets the height in script and does not use `field-sizing: content`,
 * because Safari below 26.2 and Firefox do not support that property. The
 * property also ignores `rows`.
 *
 * @internal
 */
export function useTextareaAutoResize(
	ref: RefObject<HTMLTextAreaElement | null>,
	enabled: boolean,
): void {
	// The text of the last fit, or `null` when no fit holds.
	const fitted = useRef<string | null>(null)

	// After each render, fit when the text differs from the text of the last fit.
	useLayoutEffect(() => {
		const textarea = ref.current

		if (!enabled || !textarea || textarea.value === fitted.current) return

		fitted.current = textarea.value

		fitTextarea(textarea)
	})

	useLayoutEffect(() => {
		const textarea = ref.current

		if (!enabled || !textarea) return

		const onInput = () => {
			fitted.current = textarea.value

			fitTextarea(textarea)
		}

		let width = textarea.clientWidth
		let frame = 0

		const observer = new ResizeObserver(() => {
			if (textarea.clientWidth === width) return

			width = textarea.clientWidth

			cancelAnimationFrame(frame)

			frame = requestAnimationFrame(() => fitTextarea(textarea))
		})

		textarea.addEventListener('input', onInput)

		observer.observe(textarea)

		return () => {
			textarea.removeEventListener('input', onInput)

			observer.disconnect()

			cancelAnimationFrame(frame)

			textarea.style.height = ''

			fitted.current = null
		}
	}, [ref, enabled])
}
