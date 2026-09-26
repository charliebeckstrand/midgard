'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * A cursor that a drag holds on the whole page. `grabbing` is the closed hand of
 * a move. The others are the cursors that the drag surfaces show at rest.
 */
export type DragCursor =
	| 'grabbing'
	| 'col-resize'
	| 'row-resize'
	| 'ew-resize'
	| 'ns-resize'
	| 'nwse-resize'
	| 'nesw-resize'
	| 'crosshair'
	| 'pointer'
	| 'default'

// The live holds, oldest first. The newest hold sets the cursor.
const holds: { cursor: DragCursor }[] = []

// The single injected rule, created by the first hold and removed by the last.
let rule: HTMLStyleElement | null = null

/** Writes the rule for the newest hold, or removes it when no hold is live. @internal */
function paint() {
	const top = holds.at(-1)

	if (top === undefined) {
		rule?.remove()

		rule = null

		return
	}

	if (rule === null) {
		rule = document.createElement('style')

		rule.dataset.dragCursor = ''

		document.head.append(rule)
	}

	// A universal `!important` rule wins over the cursor of each element that the
	// pointer crosses: a `text` input, a `pointer` link, a sibling handle.
	rule.textContent = `*{cursor:${top.cursor} !important}`
}

/**
 * Holds `cursor` on the whole page until the returned release runs. For a drag
 * that runs outside React state, such as a gesture that adds its own window
 * listeners. The release is idempotent.
 *
 * @remarks The caller must release on each end of the drag, and also on unmount.
 * A hold that is not released keeps the cursor on the page.
 *
 * @internal
 */
export function holdDragCursor(cursor: DragCursor = 'grabbing'): () => void {
	const hold = { cursor }

	holds.push(hold)

	paint()

	return () => {
		const index = holds.indexOf(hold)

		if (index === -1) return

		holds.splice(index, 1)

		paint()
	}
}

/**
 * Holds the drag cursor through a start and an end that the caller calls from
 * its own handlers. For a drag that keeps its state in a ref. The hook releases
 * the hold on unmount, so a drag that its node outlives cannot leave the cursor
 * on the page.
 *
 * @internal
 */
export function useDragCursorHold(cursor: DragCursor = 'grabbing') {
	const release = useRef<(() => void) | null>(null)

	useEffect(
		() => () => {
			release.current?.()

			release.current = null
		},
		[],
	)

	/** Starts the hold. A second call during the same drag does nothing. */
	const start = useCallback(() => {
		if (release.current === null) release.current = holdDragCursor(cursor)
	}, [cursor])

	/** Ends the hold. A call with no live hold does nothing. */
	const end = useCallback(() => {
		release.current?.()

		release.current = null
	}, [])

	// Stable across renders, so a handler that lists it as a dependency keeps its memo.
	return useMemo(() => ({ start, end }), [start, end])
}

/**
 * Holds a drag cursor on the whole page while `active` is true. Every drag in
 * the library goes through this rule. The cursor thus stays the drag cursor over
 * an element that sets its own cursor.
 *
 * @param active - Whether the drag is live.
 * @param cursor - The cursor to hold. The default is `grabbing`.
 *
 * @remarks Mid-drag, the element under the pointer decides the cursor, not the
 * element that the reader drags. A class on the dragged node therefore goes back
 * to the default when the pointer leaves the node. Pointer capture does not
 * repair this in each browser. This hook injects one universal `!important` rule
 * into `<head>` for the span of the drag. Overlapping drags share the rule, and
 * the newest drag sets its cursor. The rule goes when the last drag releases, on
 * a drop, a cancel, or an unmount. It does nothing during SSR.
 */
export function useDragCursor(active: boolean, cursor: DragCursor = 'grabbing'): void {
	useEffect(() => {
		if (!active) return

		return holdDragCursor(cursor)
	}, [active, cursor])
}
