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
 * `ResizeObserver` width changes that don't re-render, when a column resize
 * settles (see `resizeSettleKey`), and once web fonts settle (which reflows text
 * without resizing the box) — so the resting `cursor-help` affordance reflects
 * the current overflow. The reveal tooltip's open is re-gated live by the
 * floating engine, but the cursor has no such backstop, so a stale flag would
 * mis-cue at rest.
 *
 * Shared by the data-cell ({@link GridCellContent}) and column-header
 * (`GridHeaderTitle`) truncation surfaces.
 *
 * @param resizeSettleKey - A per-column width snapshot whose change re-measures
 * truncation: the data cell passes the engine width frozen to `undefined` while
 * a drag is in flight, then the settled width once the drag ends or a keyboard
 * nudge lands. A column resize moves the cell's width through the `<colgroup>`
 * alone, and the body cell is memoized, so the commit measure does not re-run on
 * its own; the key's change re-renders the cell (re-running the commit measure)
 * and this hook backs that up with a deferred frame in case the layout settled
 * after the synchronous read. The header omits it — it already re-renders on its
 * own `width` prop.
 * @returns `[ref, truncated]`: attach `ref` to the single-line element; read
 * `truncated` to gate the reveal tooltip.
 * @internal
 */
export function useGridTruncation<E extends HTMLElement>(
	resizeSettleKey?: unknown,
): [RefObject<E | null>, boolean] {
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

	// Deferred backstop for the settle re-measure: the `resizeSettleKey` change
	// already re-renders the cell (re-running the commit measure above), but a
	// width that lands a frame late would read stale; re-measure once more on the
	// next frame. No-op where `requestAnimationFrame` is absent (SSR / jsdom),
	// matching the observer's own fallback; the same-value bail keeps it from
	// looping.
	const mounted = useRef(false)

	useEffect(() => {
		// Read here so a `resizeSettleKey` change re-runs this effect (it gates the
		// deferred pass; the frame callback itself doesn't reference it).
		void resizeSettleKey

		// Skip the mount run — the layout effect has just measured, and a fresh rAF
		// per cell on mount is needless work in a wide / virtualized grid.
		if (!mounted.current) {
			mounted.current = true

			return
		}

		if (typeof requestAnimationFrame !== 'function') return

		const frame = requestAnimationFrame(measure)

		return () => cancelAnimationFrame(frame)
	}, [measure, resizeSettleKey])

	return [ref, truncated]
}
