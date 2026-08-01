'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

/**
 * True when `text` overflows the element at `ref.current`. Measures the laid-out
 * contents with a `Range` and compares that against the element's content box,
 * so it detects ellipsis truncation at sub-pixel precision without reading
 * `scrollWidth`.
 *
 * @remarks
 * The `Range` reads the element's own text where a mirror node would have to be
 * injected into it — so nothing is appended to a React-owned subtree, and the
 * text is never duplicated into the accessibility tree. A clipped overflow does
 * not shrink the measured range, which is what makes the comparison meaningful;
 * an element whose text wraps therefore reads as not truncated, since no
 * ellipsis is painted for a tooltip to reveal.
 *
 * Re-measures via a `ResizeObserver` and after `document.fonts.ready`, so it
 * stays accurate across resizes and late font loads. Layout-effect based; SSR
 * and layout-less environments (jsdom implements no `Range` geometry) yield
 * `false`.
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

		const check = () => {
			const range = document.createRange()

			range.selectNodeContents(el)

			// Layout-less environments don't implement Range geometry; there is no
			// width to compare, so nothing reads as truncated.
			if (typeof range.getBoundingClientRect !== 'function') {
				setTruncated(false)

				return
			}

			const textWidth = range.getBoundingClientRect().width

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
		}
	}, [ref, text])

	return truncated
}
