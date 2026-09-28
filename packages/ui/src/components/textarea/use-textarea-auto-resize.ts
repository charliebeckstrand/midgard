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
export function fitTextarea(el: HTMLTextAreaElement): void {
	if (el.clientWidth === 0) return

	el.style.height = 'auto'

	const computed = getComputedStyle(el)

	const edge =
		computed.boxSizing === 'border-box'
			? Number.parseFloat(computed.borderTopWidth) + Number.parseFloat(computed.borderBottomWidth)
			: -(Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom))

	el.style.height = `${el.scrollHeight + edge}px`
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
		const el = ref.current

		if (!enabled || !el || el.value === fitted.current) return

		fitted.current = el.value

		fitTextarea(el)
	})

	useLayoutEffect(() => {
		const el = ref.current

		if (!enabled || !el) return

		const onInput = () => {
			fitted.current = el.value

			fitTextarea(el)
		}

		let width = el.clientWidth
		let frame = 0

		const observer = new ResizeObserver(() => {
			if (el.clientWidth === width) return

			width = el.clientWidth

			cancelAnimationFrame(frame)

			frame = requestAnimationFrame(() => fitTextarea(el))
		})

		el.addEventListener('input', onInput)

		observer.observe(el)

		return () => {
			el.removeEventListener('input', onInput)

			observer.disconnect()

			cancelAnimationFrame(frame)

			el.style.height = ''

			fitted.current = null
		}
	}, [ref, enabled])
}
