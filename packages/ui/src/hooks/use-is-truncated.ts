'use client'

import { type RefObject, useEffectEvent, useLayoutEffect, useState } from 'react'
import { isOverflowing } from './use-truncation'

/** Whether `text` overflows `el`. An empty string or no element is never truncated. @internal */
function overflows(el: HTMLElement | null, text: string): boolean {
	return el != null && text !== '' && isOverflowing(el, true)
}

/**
 * True when `text` overflows the element at `ref.current`. Measures through
 * {@link isOverflowing}, which owns the measurement and its rationale, in its
 * padded mode. This hook takes an element the caller already rendered, which
 * can carry padding, where `useTruncation` owns the element it measures.
 *
 * @remarks
 * Re-measures via a `ResizeObserver` and after `document.fonts.ready`, so it
 * stays accurate across resizes and late font loads. One observer per element,
 * unlike `useTruncation`'s shared one — this hook's callers mount a handful of
 * elements, not a virtualized grid of them. Layout-effect based; SSR yields
 * `false` until the first client measurement.
 * @returns `true` while the text is truncated, else `false`.
 */
export function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
	const [truncated, setTruncated] = useState(false)

	// The subscription below measures the newest string when it fires.
	const check = useEffectEvent(() => setTruncated(overflows(ref.current, text)))

	// The subscription tracks the element, not the string: re-keying it on `text`
	// would tear down and rebuild the observer — and re-subscribe `fonts.ready` —
	// on every character.
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		const observer = new ResizeObserver(check)

		observer.observe(el)

		let fontsCanceled = false

		document.fonts?.ready.then(() => {
			if (!fontsCanceled) check()
		})

		return () => {
			fontsCanceled = true

			observer.disconnect()
		}
	}, [ref])

	// A new string re-measures against the same element and subscription.
	useLayoutEffect(() => {
		setTruncated(overflows(ref.current, text))
	}, [ref, text])

	return truncated
}
