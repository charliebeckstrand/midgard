'use client'

import { type RefObject, useEffectEvent, useLayoutEffect, useState } from 'react'
import { isOverflowing } from './use-truncation'

/**
 * True when `text` overflows the element at `ref.current`. Measures through
 * {@link isOverflowing}, which owns the measurement and its rationale, in its
 * padded mode — this hook takes an element the caller already rendered, which
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

	const check = useEffectEvent(() => {
		const el = ref.current

		setTruncated(el != null && text !== '' && isOverflowing(el, true))
	})

	// The subscription tracks the element, not the string: re-keying it on `text`
	// would tear down and rebuild the observer — and re-subscribe `fonts.ready` —
	// on every character.
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

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
	}, [ref])

	// A new string re-measures against the same element and subscription. `text`
	// is the trigger rather than something this body reads — `check` reads the
	// current string through its effect event — which is why the rule cannot see
	// the dependency and has to be told.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `text` is the trigger; `check` reads it through the effect event
	useLayoutEffect(() => {
		check()
	}, [text])

	return truncated
}
