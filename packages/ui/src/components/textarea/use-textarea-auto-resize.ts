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
 * a render that changed its text or its `rows`, such as a controlled write,
 * which sends no `input` event. It also fits the field when its content box
 * changes and the hook did not cause the change: a new width changes the line
 * wraps, and a new `size` or density scope changes the padding and the text
 * size. The resize observer ignores a change that comes from a height write of
 * the hook, and it defers the fit by one frame, so the fit does not start a
 * resize-observer loop. After a native reset of the form, the hook fits the
 * field in the next frame, because the browser restores the value after the
 * `reset` event. When `enabled` becomes false, the hook removes the inline
 * height.
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
	// The text and the rows of the last fit, or `null` when no fit holds.
	const fitted = useRef<{ value: string; rows: number } | null>(null)

	// After each render, fit when the text or the rows differ from the last fit.
	useLayoutEffect(() => {
		const textarea = ref.current

		if (
			!enabled ||
			!textarea ||
			(textarea.value === fitted.current?.value && textarea.rows === fitted.current.rows)
		)
			return

		fitted.current = { value: textarea.value, rows: textarea.rows }

		fitTextarea(textarea)
	})

	useLayoutEffect(() => {
		const textarea = ref.current

		if (!enabled || !textarea) return

		const fit = () => {
			fitted.current = { value: textarea.value, rows: textarea.rows }

			fitTextarea(textarea)
		}

		let frame = 0

		const deferFit = () => {
			cancelAnimationFrame(frame)

			frame = requestAnimationFrame(fit)
		}

		// The content box and the inline height at the last observation. A new
		// inline height is a write of the hook (or a drag of the resize handle), so
		// the change it causes needs no fit. A change with the same inline height
		// comes from the layout or the styles.
		const style = getComputedStyle(textarea)

		let width = textarea.clientWidth
		let box =
			textarea.clientHeight -
			Number.parseFloat(style.paddingTop) -
			Number.parseFloat(style.paddingBottom)
		let inline = textarea.style.height

		const observer = new ResizeObserver(([entry]) => {
			const next = entry?.contentRect.height ?? 0

			const resized =
				textarea.clientWidth !== width || (next !== box && textarea.style.height === inline)

			width = textarea.clientWidth
			box = next
			inline = textarea.style.height

			if (resized) deferFit()
		})

		const form = textarea.form

		textarea.addEventListener('input', fit)

		form?.addEventListener('reset', deferFit)

		observer.observe(textarea)

		return () => {
			textarea.removeEventListener('input', fit)

			form?.removeEventListener('reset', deferFit)

			observer.disconnect()

			cancelAnimationFrame(frame)

			textarea.style.height = ''

			fitted.current = null
		}
	}, [ref, enabled])
}
