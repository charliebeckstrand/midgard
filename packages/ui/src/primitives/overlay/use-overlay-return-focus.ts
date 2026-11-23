'use client'

import { type RefObject, useEffectEvent, useLayoutEffect } from 'react'
import { FOCUSABLE_SELECTOR, getTabbableElements } from '../../utilities/focusable-selector'

/** A modal overlay, from its mount to its unmount. */
type Entry = {
	/** The order of the mount. A higher number mounted later. */
	order: number
	/**
	 * The default target: the element that had the focus as the overlay
	 * opened, or the target that an overlay below it gave at its unmount.
	 */
	target: Element | null
	/**
	 * The ancestors of the element that had the focus as the overlay opened,
	 * nearest first, below `<body>`. When the target is gone at the close, the
	 * focus goes into the nearest one that is still in the page.
	 */
	path: Element[]
}

/** The mounted modal overlays. */
const entries = new Set<Entry>()

let mounts = 0

/** Adds the entry of an overlay that mounts, with `target` as its default target. */
function mount(target: Element | null): Entry {
	mounts += 1

	const entry: Entry = { order: mounts, target, path: ancestors(target) }

	entries.add(entry)

	return entry
}

/** The ancestors of `element`, nearest first, below `<body>`. */
function ancestors(element: Element | null): Element[] {
	const path: Element[] = []

	const body = element?.ownerDocument.body

	for (let node = element?.parentElement; node && node !== body; node = node.parentElement) {
		path.push(node)
	}

	return path
}

/**
 * The elements that can get the focus back, in order. The first is the target,
 * if it is in the page. Then come the elements of each ancestor of the old
 * target that is still in the page, nearest first: the ancestor, if it can get
 * the focus, else its tabbable elements. The focus then stays near the place
 * of the action, and does not fall to `<body>` (WCAG 2.4.3). This covers a
 * button in a table row that the overlay deleted, and a trigger that is in the
 * page but hidden, such as a control in a sidebar that a setting of the overlay
 * hid.
 */
function* candidates(target: Element | null, path: Element[]): Generator<HTMLElement> {
	if (target instanceof HTMLElement && target.isConnected) yield target

	// An ancestor can be in the page but hold no control, such as a list whose
	// last row the overlay deleted. The walk then goes on up the path.
	for (const node of path) {
		if (!node.isConnected || !(node instanceof HTMLElement)) continue

		if (node.matches(FOCUSABLE_SELECTOR) && node.tabIndex >= 0) yield node
		else yield* getTabbableElements(node)
	}
}

/** Whether `target` is not an element that can get the focus back. */
function missing(target: Element | null): boolean {
	return (
		!(target instanceof HTMLElement) || !target.isConnected || target === target.ownerDocument.body
	)
}

/**
 * Gives the focus back to `target` for `entry`, which unmounted. An overlay
 * that mounted after it takes the target instead, if its own target is
 * missing.
 */
function giveBack(entry: Entry, target: Element | null): void {
	const above = [...entries].filter((other) => other.order > entry.order)

	if (above.length > 0) {
		for (const other of above) {
			if (!missing(other.target)) continue

			other.target = target

			other.path = entry.path
		}

		return
	}

	const doc = (target ?? entry.path[0])?.ownerDocument

	if (!doc) return

	const active = doc.activeElement

	if (active !== null && active !== doc.body) return

	// A call to `focus()` does nothing on an element that cannot get the focus,
	// such as a hidden one. The activeElement then tells if the call took.
	for (const element of candidates(target, entry.path)) {
		element.focus({ preventScroll: true })

		if (doc.activeElement === element) return
	}
}

/**
 * Gives the focus back when a modal overlay unmounts. The target is
 * `returnFocusTo`, else the element that had the focus as the overlay opened.
 *
 * @remarks The focus manager of Floating UI returns the focus when it is
 * disabled, and the overlay disables it at the close. If the focus manager
 * returned the focus, the focus would go to the trigger at the start of the
 * exit, and a fast second Enter on a button of the panel would press the
 * trigger and open the overlay again. Thus the overlay gives the focus manager
 * no return focus and returns the focus itself, after the exit.
 *
 * When the target is gone at the close, the focus goes into the nearest
 * ancestor of the old focus that is still in the page.
 *
 * The focus comes back only from `<body>`. The overlay moves the focus there
 * at the close, and the browser moves it there when the focused element of an
 * open overlay unmounts. A focus that went anywhere else during the exit stays.
 *
 * An overlay can open as another overlay closes, such as a Drawer that opens
 * from a pick in a command palette. The focus then belongs to the overlay that
 * mounted later. Thus an overlay does not move the focus at its unmount while
 * an overlay that mounted after it is on screen. Each such overlay whose
 * target is gone, or is no element, takes the target of the overlay that
 * unmounts. The target of the Drawer is the pick, which unmounts with the
 * palette, so the focus goes back to the trigger of the palette when the
 * Drawer closes.
 *
 * The call must be in the subtree that unmounts at the end of the exit.
 *
 * @param returnFocusTo - The element to focus at unmount, if any.
 * @internal
 */
export function useOverlayReturnFocus(
	returnFocusTo: RefObject<HTMLElement | null> | undefined,
): void {
	// The target at unmount, so a `returnFocusTo` set during the exit counts.
	const targetFor = useEffectEvent((entry: Entry) => returnFocusTo?.current ?? entry.target)

	useLayoutEffect(() => {
		// The layout effects of a child run before the effects of its parent. The
		// initial focus of the overlay thus has not moved the focus yet.
		const entry = mount(document.activeElement)

		return () => {
			entries.delete(entry)

			const target = targetFor(entry)

			// The microtask runs after the commit removes the overlay from the DOM,
			// and after the layout effects of an overlay that mounts in the same
			// commit add its entry.
			queueMicrotask(() => giveBack(entry, target))
		}
	}, [])
}
