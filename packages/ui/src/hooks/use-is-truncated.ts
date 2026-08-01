'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'
import { isOverflowing } from './use-truncation'

/**
 * True when `text` overflows the element at `ref.current`. Shares
 * {@link useTruncation}'s overflow test — an integer `scrollWidth` read, falling
 * back to a `Range` over the element's own contents for a sub-pixel clip — with
 * its horizontal padding subtracted, since the elements this measures carry it.
 *
 * @remarks
 * The `Range` reads the element's own text where a mirror node would have to be
 * injected into it, so nothing is appended to a React-owned subtree and the text
 * is never duplicated into the accessibility tree. A clipped overflow does not
 * shrink the measured range, which is what makes the comparison meaningful; an
 * element whose text wraps therefore reads as not truncated, since no ellipsis is
 * painted for a tooltip to reveal.
 *
 * Re-measures via a `ResizeObserver` and after `document.fonts.ready`, so it
 * stays accurate across resizes and late font loads. One observer per element,
 * unlike `useTruncation`'s shared one — this hook's callers mount a handful of
 * elements, not a virtualized grid of them. Layout-effect based; SSR yields
 * `false` until the first client measurement.
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

		const check = () => setTruncated(isOverflowing(el, true))

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
