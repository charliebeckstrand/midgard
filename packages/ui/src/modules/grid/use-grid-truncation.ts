'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Whether an element's single-line content overflows its content box, measured
 * at sub-pixel precision. `scrollWidth`/`clientWidth` round to integers, so a
 * fraction of a pixel of overflow can read as fitting (a clipped element with no
 * tooltip) or an exact fit as overflowing (a tooltip with nothing to reveal); a
 * `Range` over the contents reports their true laid-out width, regardless of the
 * overflow clip. The truncating element carries no padding or border, so its
 * bounding width is its content box; half a pixel of slack absorbs rounding
 * noise.
 *
 * @internal
 */
function isOverflowing(el: HTMLElement): boolean {
	const range = document.createRange()

	range.selectNodeContents(el)

	// Layout-less environments (jsdom) don't implement Range geometry; fall back
	// to the integer scroll/client comparison there.
	if (typeof range.getBoundingClientRect !== 'function') return el.scrollWidth > el.clientWidth

	return range.getBoundingClientRect().width - el.getBoundingClientRect().width > 0.5
}

/**
 * Tracks whether an element's single-line content overflows its box (clipped to
 * an ellipsis). Measured eagerly — after every commit, for content changes, on
 * `ResizeObserver` width changes that don't re-render, and once web fonts settle
 * (which reflows text without resizing the box) — because a tooltip gated by
 * this flag won't open mid-hover once `enabled` flips, so truncation must be
 * known before the pointer arrives.
 *
 * Shared by the data-cell ({@link GridCellContent}) and column-header
 * (`GridHeaderTitle`) truncation surfaces.
 *
 * @returns `[ref, truncated]`: attach `ref` to the single-line element; read
 * `truncated` to gate the reveal tooltip.
 * @internal
 */
export function useGridTruncation<E extends HTMLElement>(): [RefObject<E | null>, boolean] {
	const ref = useRef<E>(null)

	const [truncated, setTruncated] = useState(false)

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop.
	const measure = useCallback(() => {
		const el = ref.current

		if (el) setTruncated(isOverflowing(el))
	}, [])

	useLayoutEffect(measure)

	useEffect(() => {
		const el = ref.current

		if (!el) return

		if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {})

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [measure])

	return [ref, truncated]
}
