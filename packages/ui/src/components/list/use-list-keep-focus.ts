'use client'

import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { querySlot } from '../../core/query-slot'

/** Where the focus is in a list: the id of its row, and the child indexes from the row down to the focused element. */
type FocusSpot = { id: string; path: readonly number[]; element: Element }

/** The child indexes from `row` down to `element`. */
function pathFrom(row: Element, element: Element): number[] {
	const path: number[] = []

	for (let node = element; node !== row; ) {
		const parent = node.parentElement

		if (parent === null) return []

		path.unshift(Array.prototype.indexOf.call(parent.children, node))

		node = parent
	}

	return path
}

/** The element at `path` below `row`, or `null` when the new row has no element there. */
function follow(row: Element, path: readonly number[]): Element | null {
	let node: Element | null = row

	for (const index of path) node = node?.children[index] ?? null

	return node
}

/**
 * Keeps the focus on the same control of a row when the rows of the list mount
 * again.
 *
 * @remarks
 * A reorderable list changes its `<ul>` to the `Reorder` group when the module
 * of the group arrives, and React then mounts the rows again (see
 * `useListReorder`). The focused element leaves the DOM, and the browser moves
 * the focus to `<body>`. The hook notes the row and the place in the row of each
 * focus in the list. When `remount` changes, a layout effect gives the focus to
 * the element at the same place in the new row. It does this only while the
 * focus is on `<body>` and the noted element is gone, so a focus that left the
 * list stays where it is. A layout effect runs before the mutation observer of
 * an overlay (`useOverlayKeepFocus`), so that observer does not move the focus
 * to the first control of the overlay (WCAG 2.4.3).
 *
 * @param containerRef - The root of the list.
 * @param remount - A value that changes when the rows mount again.
 * @internal
 */
export function useListKeepFocus(
	containerRef: RefObject<HTMLElement | null>,
	remount: unknown,
): void {
	const spot = useRef<FocusSpot | null>(null)

	// The root of the list changes at the swap, so the listener is on the document.
	useEffect(() => {
		const doc = containerRef.current?.ownerDocument

		if (!doc) return

		const note = (event: FocusEvent) => {
			const container = containerRef.current

			const target = event.target instanceof Element ? event.target : null

			const row = target?.closest('[data-slot="list-item"]')

			const id = row?.getAttribute('data-item-id')

			spot.current =
				container && target && row && id && container.contains(row)
					? { id, path: pathFrom(row, target), element: target }
					: null
		}

		// A focus that goes to `<body>`, such as at a press on empty space, sends
		// no `focusin`. A blur with no next element from an element that stays in
		// the DOM thus drops the note. An element that leaves the DOM keeps it. The
		// check waits one microtask, after the commit that can remove the element.
		const drop = (event: FocusEvent) => {
			if (event.relatedTarget !== null) return

			const target = event.target

			queueMicrotask(() => {
				if (target instanceof Element && target.isConnected && spot.current?.element === target) {
					spot.current = null
				}
			})
		}

		doc.addEventListener('focusin', note)

		doc.addEventListener('focusout', drop)

		return () => {
			doc.removeEventListener('focusin', note)

			doc.removeEventListener('focusout', drop)
		}
	}, [containerRef])

	// The `remount` of the last commit.
	const mounted = useRef(remount)

	useLayoutEffect(() => {
		if (mounted.current === remount) return

		mounted.current = remount

		const noted = spot.current

		const container = containerRef.current

		if (!noted || !container || noted.element.isConnected) return

		const doc = container.ownerDocument

		if (doc.activeElement !== null && doc.activeElement !== doc.body) return

		const row = querySlot(container, 'list-item', 'item-id', noted.id)

		const target = row && follow(row, noted.path)

		if (target instanceof HTMLElement || target instanceof SVGElement)
			target.focus({ preventScroll: true })
	}, [remount, containerRef])
}
