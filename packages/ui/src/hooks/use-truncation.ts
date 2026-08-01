'use client'

import {
	type RefCallback,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
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
 * Set for the duration of a {@link focusWithoutReveal} call and read by
 * {@link useTruncation}'s arm, which skips its synchronous flush while it holds.
 * Module-level because the arm is a native listener with no line to its caller.
 *
 * @internal
 */
let programmaticFocus = false

/**
 * Moves focus to `el` without arming the truncation reveal's eager flush.
 *
 * @remarks {@link useTruncation} arms on a native `focusin` that fires
 * synchronously inside `el.focus()`, and its arm flushes state synchronously so a
 * genuine hover or keyboard focus opens the reveal on that same dispatch. A
 * programmatic focus wants neither: it opens no reveal, and it can land inside a
 * React commit (a grid editor focused from a post-mount effect), where `flushSync`
 * cannot flush and warns. Callers that move focus into a possibly-truncated cell
 * during render/commit route through here so the arm commits through a plain
 * update — the same eventual state, without the mid-render flush.
 *
 * @internal
 */
export function focusWithoutReveal(el: HTMLElement): void {
	programmaticFocus = true

	try {
		el.focus()
	} finally {
		programmaticFocus = false
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
 * @param options - `armRef`: element whose pointer/focus contact arms the
 * measure, when the reveal's trigger surface is an ancestor of the measured
 * element (a legend entry around its label span); defaults to the measured
 * element itself. `suspended`: stands every measure down (a column drag-resize,
 * whose reveal is held closed anyway); the first commit after suspension lifts
 * re-measures armed elements.
 * @returns `[ref, truncated, measure, contacted]`: attach `ref` to the
 * single-line element (a callback ref — it survives the element being
 * reparented, re-binding its listeners to the replacement node); read
 * `truncated` to gate the reveal tooltip; call `measure` to force a re-read
 * (e.g. a deferred backstop after a late layout settle) — a no-op until contact
 * arms the element; read `contacted` to defer mounting reveal machinery until
 * the first contact that could ever open it.
 * @internal
 */
export function useTruncation<E extends HTMLElement>(options?: {
	armRef?: RefObject<HTMLElement | null>
	suspended?: boolean
}): [RefCallback<E>, boolean, () => void, boolean] {
	const { armRef, suspended = false } = options ?? {}

	const elRef = useRef<E | null>(null)

	const [truncated, setTruncated] = useState(false)

	// Armed on first pointer/focus contact; measures stand down before it, so a
	// cell scrolled through and never visited costs no layout reads.
	const armed = useRef(false)

	// The arm, as state: consumers that lazily mount their reveal machinery
	// (a cell's tooltip stack) re-render once when contact first arrives.
	const [contacted, setContacted] = useState(false)

	const suspendedRef = useRef(suspended)

	suspendedRef.current = suspended

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop.
	const measure = useCallback(() => {
		if (!armed.current || suspendedRef.current) return

		const el = elRef.current

		if (el) setTruncated(isOverflowing(el))
	}, [])

	// The listener/observer bindings live in the effect below, keyed on this
	// version: a consumer that reparents the measured element while it stays
	// mounted (a cell wrapping its span in a lazily-mounted tooltip) commits a
	// replacement node the effect never sees on its own, stranding the bindings
	// on the detached one. The callback ref bumps the version on a replacement —
	// and only then, so the plain mount pays no extra render.
	const [nodeVersion, setNodeVersion] = useState(0)

	const bound = useRef(false)

	const setNode = useCallback((node: E | null) => {
		elRef.current = node

		if (node && bound.current) setNodeVersion((version) => version + 1)
	}, [])

	useLayoutEffect(measure)

	useEffect(() => {
		// Read here so a node replacement (which bumps the version) re-runs the
		// bindings against the new element; the body reads the node via `elRef`.
		void nodeVersion

		const el = elRef.current

		if (!el) return

		bound.current = true

		// The width observation and the font-settle re-measure exist to keep an
		// armed flag current; before contact nothing reads it, so both defer to the
		// first arm — an unvisited cell costs two listener registrations and
		// nothing else (a virtualized scroll step otherwise pays an observe /
		// unobserve and a `fonts.ready` subscription per recycled cell).
		let unobserve: (() => void) | null = null

		const watch = () => {
			unobserve = observeTruncation(el, measure)

			if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {})
		}

		const arm = () => {
			armed.current = true

			if (!unobserve) watch()

			const commit = () => {
				setContacted(true)

				measure()
			}

			// Synchronous commit, because ordering decides whether the reveal opens:
			// the tooltip's hover logic rides React's root-delegated events, and this
			// element-level listener fires first on the same `pointerover`/`focusin`
			// dispatch — flushing here lands `truncated` (and the tooltip's `enabled`)
			// before the hover logic evaluates the very contact that armed it.
			//
			// A programmatic focus (see `focusWithoutReveal`) is the exception: it
			// opens no reveal and can arm this listener from inside a React commit,
			// where `flushSync` cannot flush and warns. It commits plainly there — the
			// same eventual state the mid-render flush would have deferred to anyway.
			if (programmaticFocus) commit()
			else flushSync(commit)
		}

		// The reveal these flags gate opens on hover or focus, and both begin with
		// one of these events, so arming on the trigger surface measures just in
		// time. `pointerover` (not `pointerenter`) so the contact also bubbles up
		// from descendants when the arm target wraps the measured element.
		const target = armRef?.current ?? el

		target.addEventListener('pointerover', arm)

		target.addEventListener('focusin', arm)

		// A reparent re-runs these bindings with the arm already taken (the version
		// bump); the replacement node picks its observation straight back up.
		if (armed.current) watch()

		return () => {
			target.removeEventListener('pointerover', arm)

			target.removeEventListener('focusin', arm)

			unobserve?.()
		}
	}, [measure, armRef, nodeVersion])

	return [setNode, truncated, measure, contacted]
}
