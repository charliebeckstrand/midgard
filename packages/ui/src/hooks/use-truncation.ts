'use client'

import { resize } from 'motion'
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
import { useStableEvent } from './use-stable-event'

/**
 * Floating-point epsilon (px) on the `Range` overflow test. The single-line
 * element fits exactly when its content is no wider than its box. The `Range`
 * width minus the box width is therefore ≤ 0 while it fits, because the line
 * shrink-wraps to its text, or fills and ends short. It turns positive by one
 * device sub-pixel (~1/64px observed), the instant the ellipsis paints. So the
 * test wants a bare `> 0`; this epsilon only clears float dust short of that
 * first real fraction.
 *
 * A larger slack (a prior tenth-of-a-pixel) left a dead zone. An element clipped
 * by less than that read as fitting, so its reveal tooltip never armed until the
 * box shrank a further fraction. That was a clipped element with no tooltip
 * until nudged smaller.
 *
 * @internal
 */
const OVERFLOW_SLACK = 0.01

/**
 * Whether an element's single-line content overflows its content box. A whole
 * pixel of overflow is read straight from `scrollWidth`/`clientWidth`. That is
 * integer, but unambiguous and cross-browser, and never a false positive
 * (`scrollWidth` never dips below `clientWidth` for fitting content). Below a
 * pixel those round the gap away. A `clientWidth` rounded up to meet
 * `scrollWidth` reads as a fit while the ellipsis is already painted. A `Range`
 * over the contents therefore supplies the true sub-pixel width, unaffected by
 * the overflow clip.
 *
 * @param el - The single-line element to measure.
 * @param padded - Subtract the element's horizontal padding from its box before
 * comparing. Off by default, since a truncating element must carry no padding or
 * border for its bounding width to *be* its content box. {@link useIsTruncated}
 * measures elements that do carry it.
 * @internal
 */
export function isOverflowing(el: HTMLElement, padded = false): boolean {
	if (el.scrollWidth > el.clientWidth) return true

	const range = document.createRange()

	range.selectNodeContents(el)

	// Layout-less environments (jsdom) don't implement Range geometry; the integer
	// comparison above is the only signal there.
	if (typeof range.getBoundingClientRect !== 'function') return false

	const boxWidth = el.getBoundingClientRect().width - (padded ? horizontalPadding(el) : 0)

	return range.getBoundingClientRect().width - boxWidth > OVERFLOW_SLACK
}

/** An element's left plus right computed padding, in px. @internal */
function horizontalPadding(el: HTMLElement): number {
	const styles = getComputedStyle(el)

	return parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
}

/**
 * Set for the duration of a {@link focusWithoutReveal} call.
 * {@link useTruncation}'s arm reads it, and skips its synchronous flush while it
 * holds.
 * Module-level because the arm is a native listener with no line to its caller.
 *
 * @internal
 */
let programmaticFocus = false

/**
 * Moves focus to `el` without arming the truncation reveal's eager flush.
 *
 * @remarks {@link useTruncation} arms on a native `focusin` that fires
 * synchronously inside `el.focus()`. Its arm flushes state synchronously, so a
 * genuine hover or keyboard focus opens the reveal on that same dispatch. A
 * programmatic focus wants neither. It opens no reveal. It can land inside a
 * React commit (a grid editor focused from a post-mount effect), where
 * `flushSync` cannot flush and warns. Callers that move focus into a
 * possibly-truncated cell during render/commit route through here, so the arm
 * commits through a plain update. That is the same eventual state, without the
 * mid-render flush.
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
 * an ellipsis). Measured lazily. The first pointer or focus contact arms the
 * element and takes the first read. An armed element then re-measures eagerly:
 *
 * - After every commit.
 * - On `ResizeObserver` width changes that don't re-render.
 * - Once web fonts settle, which reflows text without resizing the box.
 *
 * The flag is therefore current whenever it can be seen. Every consumer gates a
 * hover/focus reveal (a tooltip's arming, a `cursor-help`) on `truncated`, and
 * none of those is observable before the pointer or focus arrives. An element
 * that is never visited therefore never pays a layout read. The eager
 * alternative charged every mounted cell a `Range` measure per commit, which
 * billed a virtualized grid's scroll step hundreds of forced reads.
 *
 * The overflow test reads `scrollWidth`/`clientWidth` first, and falls back to
 * a `Range` over the contents for sub-pixel clips. The truncating element must
 * therefore be a single line (`nowrap` + ellipsis) with no padding or border of
 * its own.
 *
 * @param options - `armRef` is the element whose pointer/focus contact arms the
 * measure. It applies when the reveal's trigger surface is an ancestor of the
 * measured element (a legend entry around its label span). It defaults to the
 * measured element itself. `suspended` stands every measure down (a column
 * drag-resize, whose reveal is held closed anyway); the first commit after suspension lifts
 * re-measures armed elements. A function form is read at each measure, so a
 * change of it renders nothing, and the caller measures again when it lifts.
 * @returns `[ref, truncated, measure, contacted]`:
 *
 * - Attach `ref` to the single-line element. It is a callback ref, so it
 *   survives the element being reparented, re-binding its listeners to the
 *   replacement node.
 * - Read `truncated` to gate the reveal tooltip.
 * - Call `measure` to force a re-read (e.g. a deferred backstop after a late
 *   layout settle). It is a no-op until contact arms the element.
 * - Read `contacted` to defer mounting reveal machinery until the first contact
 *   that could ever open it.
 * @internal
 */
export function useTruncation<E extends HTMLElement>(options?: {
	armRef?: RefObject<HTMLElement | null>
	suspended?: boolean | (() => boolean)
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

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop. It reads the newest `suspended`, and its identity holds
	// for the mount.
	const measure = useStableEvent(() => {
		if (!armed.current || (typeof suspended === 'function' ? suspended() : suspended)) return

		const el = elRef.current

		if (el) setTruncated(isOverflowing(el))
	})

	// The listener/observer bindings live in the effect below, keyed on the node
	// they bind: a consumer that reparents the measured element while it stays
	// mounted (a cell wrapping its span in a lazily-mounted tooltip) commits a
	// replacement node the effect never sees on its own, stranding the bindings
	// on the detached one. The callback ref puts only a replacement in state, so
	// the plain mount pays no extra render and binds the node of the ref.
	const [replacement, setReplacement] = useState<E | null>(null)

	const bound = useRef(false)

	const setNode = useCallback((node: E | null) => {
		elRef.current = node

		if (node && bound.current) setReplacement(node)
	}, [])

	useLayoutEffect(() => measure())

	useEffect(() => {
		const el = replacement ?? elRef.current

		if (!el) return

		bound.current = true

		// The width observation and the font-settle re-measure exist to keep an
		// armed flag current. Before contact nothing reads it, so both defer to the
		// first arm. An unvisited cell costs two listener registrations and nothing
		// else (a virtualized scroll step otherwise pays an observe / unobserve and
		// a `fonts.ready` subscription per recycled cell).
		let unobserve: (() => void) | null = null

		const watch = () => {
			unobserve = resize(el, measure)

			document.fonts?.ready.then(measure)
		}

		const arm = () => {
			armed.current = true

			if (!unobserve) watch()

			const commit = () => {
				setContacted(true)

				measure()
			}

			// Synchronous commit, because ordering decides whether the reveal opens.
			// The tooltip's hover logic rides React's root-delegated events, and this
			// element-level listener fires first on the same `pointerover`/`focusin`
			// dispatch. Flushing here lands `truncated` (and the tooltip's `enabled`)
			// before the hover logic evaluates the very contact that armed it.
			//
			// A programmatic focus (see `focusWithoutReveal`) is the exception. It
			// opens no reveal and can arm this listener from inside a React commit,
			// where `flushSync` cannot flush and warns. It commits plainly there, the
			// same eventual state that the mid-render flush defers to anyway.
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

		// A reparent re-runs these bindings with the arm already taken (a new
		// replacement); the replacement node picks its observation straight back up.
		if (armed.current) watch()

		return () => {
			target.removeEventListener('pointerover', arm)

			target.removeEventListener('focusin', arm)

			unobserve?.()
		}
	}, [measure, armRef, replacement])

	return [setNode, truncated, measure, contacted]
}
