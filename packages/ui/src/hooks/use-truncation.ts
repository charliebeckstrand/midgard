'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Floating-point epsilon (px) on the `Range` overflow test. The single-line
 * element fits exactly when its content is no wider than its box, so the `Range`
 * width minus the box width is ≤ 0 while it fits (the line shrink-wraps to its
 * text, or fills and ends short) and turns positive — by one device sub-pixel
 * (~1/64px observed) — the instant the ellipsis paints. So the test wants a bare
 * `> 0`; this epsilon only clears float dust short of that first real fraction.
 *
 * A larger slack (a prior tenth-of-a-pixel) left a dead zone: an element clipped
 * by less than that read as fitting, so its reveal tooltip never armed until the
 * box shrank a further fraction — a clipped element with no tooltip until nudged
 * smaller.
 *
 * @internal
 */
const OVERFLOW_SLACK = 0.01

/**
 * Whether an element's single-line content overflows its content box. A whole
 * pixel of overflow is read straight from `scrollWidth`/`clientWidth` — integer,
 * but unambiguous and cross-browser, and never a false positive (`scrollWidth`
 * never dips below `clientWidth` for fitting content). Below a pixel those round
 * the gap away — a `clientWidth` rounded up to meet `scrollWidth` reads as a fit
 * while the ellipsis is already painted — so a `Range` over the contents supplies
 * the true sub-pixel width, unaffected by the overflow clip. The truncating
 * element must carry no padding or border for its bounding width to be its
 * content box.
 *
 * @internal
 */
function isOverflowing(el: HTMLElement): boolean {
	if (el.scrollWidth > el.clientWidth) return true

	const range = document.createRange()

	range.selectNodeContents(el)

	// Layout-less environments (jsdom) don't implement Range geometry; the integer
	// comparison above is the only signal there.
	if (typeof range.getBoundingClientRect !== 'function') return false

	return range.getBoundingClientRect().width - el.getBoundingClientRect().width > OVERFLOW_SLACK
}

/**
 * A single {@link ResizeObserver} shared by every truncation element, fanning
 * each width change out to the affected element's `measure`. One observer for the
 * document beats one per element: a wide, virtualized grid mounts hundreds of
 * truncation cells, and an observer apiece multiplies the registration and
 * per-frame dispatch cost a shared instance pays once.
 *
 * @internal
 */
let sharedResizeObserver: ResizeObserver | null = null

/** Per-element `measure` callbacks the {@link sharedResizeObserver} dispatches to. @internal */
const measureCallbacks = new WeakMap<Element, () => void>()

/**
 * Registers `el` with the shared {@link ResizeObserver}, routing its width
 * changes to `measure`; returns an unobserve cleanup. A no-op where
 * `ResizeObserver` is unavailable (SSR / jsdom), matching the integer-only
 * overflow path there.
 *
 * @internal
 */
function observeTruncation(el: Element, measure: () => void): () => void {
	if (typeof ResizeObserver === 'undefined') return () => {}

	if (!sharedResizeObserver) {
		sharedResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) measureCallbacks.get(entry.target)?.()
		})
	}

	measureCallbacks.set(el, measure)

	sharedResizeObserver.observe(el)

	return () => {
		sharedResizeObserver?.unobserve(el)

		measureCallbacks.delete(el)
	}
}

/**
 * Tracks whether an element's single-line content overflows its box (clipped to
 * an ellipsis). Measured lazily: the first pointer or focus contact arms the
 * element and takes the first read, and an armed element then re-measures
 * eagerly — after every commit, on `ResizeObserver` width changes that don't
 * re-render, and once web fonts settle (which reflows text without resizing
 * the box) — so the flag is current whenever it can be seen. Every consumer
 * gates a hover/focus reveal (a tooltip's arming, a `cursor-help`) on
 * `truncated`, and none of those is observable before the pointer or focus
 * arrives, so an element that is never visited never pays a layout read; the
 * eager alternative charged every mounted cell a `Range` measure per commit,
 * which billed a virtualized grid's scroll step hundreds of forced reads.
 *
 * The overflow test reads `scrollWidth`/`clientWidth` first and falls back to a
 * `Range` over the contents for sub-pixel clips, so the truncating element must
 * be a single line (`nowrap` + ellipsis) with no padding or border of its own.
 *
 * Shared by the grid's data-cell and header truncation ({@link useGridTruncation}
 * layers a resize-settle backstop on top) and the chart legend's entry labels.
 *
 * @param armRef - Element whose pointer/focus contact arms the measure, when the
 * reveal's trigger surface is an ancestor of the measured element (a legend
 * entry around its label span); defaults to the measured element itself.
 * @returns `[ref, truncated, measure]`: attach `ref` to the single-line element;
 * read `truncated` to gate the reveal tooltip; call `measure` to force a re-read
 * (e.g. a deferred backstop after a late layout settle) — an explicit call arms.
 * @internal
 */
export function useTruncation<E extends HTMLElement>(
	armRef?: RefObject<HTMLElement | null>,
): [RefObject<E | null>, boolean, () => void] {
	const ref = useRef<E>(null)

	const [truncated, setTruncated] = useState(false)

	// Armed on first pointer/focus contact; measures stand down before it, so a
	// cell scrolled through and never visited costs no layout reads.
	const armed = useRef(false)

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop.
	const measureIfArmed = useCallback(() => {
		if (!armed.current) return

		const el = ref.current

		if (el) setTruncated(isOverflowing(el))
	}, [])

	// The exported force-a-re-read arms first: an explicit call (a resize-settle
	// backstop) is a statement that the flag is about to be looked at.
	const measure = useCallback(() => {
		armed.current = true

		measureIfArmed()
	}, [measureIfArmed])

	useLayoutEffect(measureIfArmed)

	useEffect(() => {
		const el = ref.current

		if (!el) return

		const arm = () => {
			armed.current = true

			// Synchronous commit, because ordering decides whether the reveal opens:
			// the tooltip's hover logic rides React's root-delegated events, and this
			// element-level listener fires first on the same `pointerover`/`focusin`
			// dispatch — flushing here lands `truncated` (and the tooltip's `enabled`)
			// before the hover logic evaluates the very contact that armed it.
			flushSync(measureIfArmed)
		}

		// The reveal these flags gate opens on hover or focus, and both begin with
		// one of these events, so arming on the trigger surface measures just in
		// time. `pointerover` (not `pointerenter`) so the contact also bubbles up
		// from descendants when the arm target wraps the measured element.
		const target = armRef?.current ?? el

		target.addEventListener('pointerover', arm)

		target.addEventListener('focusin', arm)

		if (document.fonts?.ready) document.fonts.ready.then(measureIfArmed).catch(() => {})

		const unobserve = observeTruncation(el, measureIfArmed)

		return () => {
			target.removeEventListener('pointerover', arm)

			target.removeEventListener('focusin', arm)

			unobserve()
		}
	}, [measureIfArmed, armRef])

	return [ref, truncated, measure]
}
