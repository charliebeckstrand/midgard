'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Floating-point epsilon (px) on the `Range` overflow test. The single-line
 * element fits exactly when its content is no wider than its box, so the `Range`
 * width minus the box width is ≤ 0 while it fits (the line shrink-wraps to its
 * text, or fills and ends short) and turns positive — by one device sub-pixel
 * (~1/64px observed) — the instant the ellipsis paints. So the test wants a bare
 * `> 0`; this epsilon only clears float dust short of that first real fraction.
 *
 * A larger slack (the prior tenth-of-a-pixel) left a dead zone: a cell clipped by
 * less than that read as fitting, so its reveal tooltip never armed until the
 * column shrank a further fraction — a clipped cell with no tooltip until nudged
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
 * element carries no padding or border, so its bounding width is its content box.
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
 * A single {@link ResizeObserver} shared by every truncation cell, fanning each
 * width change out to the affected element's `measure`. One observer for the
 * document beats one per cell: a wide, virtualized grid mounts hundreds of
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

		return observeTruncation(el, measure)
	}, [measure])

	return [ref, truncated]
}
