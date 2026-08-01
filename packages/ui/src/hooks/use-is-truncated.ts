'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

const HIDDEN_STYLES =
	'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;width:auto;max-width:none;'

/**
 * True when `text` overflows the element at `ref.current`. Measures the text's
 * natural single-line width with an off-screen mirror span and compares it
 * against the element's content box, so it detects ellipsis truncation without
 * reading `scrollWidth`.
 *
 * @remarks Re-measures via a `ResizeObserver` and after `document.fonts.ready`,
 * so it stays accurate across resizes and late font loads. Layout-effect based;
 * SSR yields `false` until the first client measurement.
 * @returns `true` while the text is truncated, else `false`.
 */
export function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
	const [truncated, setTruncated] = useState(false)

	useLayoutEffect(() => {
		const el = ref.current

		if (!el || !text) {
			setTruncated(false)

			return
		}

		const measurer = document.createElement('span')

		measurer.textContent = text

		measurer.setAttribute('aria-hidden', 'true')

		measurer.style.cssText = HIDDEN_STYLES

		el.appendChild(measurer)

		const check = () => {
			const textWidth = measurer.getBoundingClientRect().width

			const styles = getComputedStyle(el)

			const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)

			const contentWidth = el.getBoundingClientRect().width - paddingX

			setTruncated(textWidth > contentWidth)
		}

		check()

		const observer = new ResizeObserver(check)

		observer.observe(el)

		let fontsCancelled = false

		document.fonts?.ready.then(() => {
			if (!fontsCancelled) check()
		})

		return () => {
			fontsCancelled = true

			observer.disconnect()

			measurer.remove()
		}
	}, [ref, text])

	return truncated
}
