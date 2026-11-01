'use client'

import { useEffect, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'

/**
 * Fires the column-resize drag lifecycle. The engine flags the column under an
 * active pointer/touch drag in `columnSizingInfo.isResizingColumn` (a keyboard
 * nudge writes the width straight through `columnSizing` instead). A transition
 * off or onto a column id therefore brackets the drag. The outgoing column ends
 * first (a settle, or a pointer that slid onto another handle), then the
 * incoming one starts. An unmount during a drag ends it. Read from the engine
 * and fired from an effect, keeping the
 * callbacks out of the controlled-state write path. Kept out of
 * {@link useGridTable} for its cognitive-complexity budget.
 *
 * @internal
 */
export function useColumnResizeLifecycle(
	resizable: boolean,
	isResizingColumn: string | false,
	onResizeStart: ((id: string) => void) | undefined,
	onResizeEnd: ((id: string) => void) | undefined,
): void {
	const resizingColumnId = resizable ? isResizingColumn : false

	const prevResizingRef = useRef<string | false>(false)

	useEffect(() => {
		const prev = prevResizingRef.current

		if (prev === resizingColumnId) return

		prevResizingRef.current = resizingColumnId

		if (prev) onResizeEnd?.(prev)

		if (resizingColumnId) onResizeStart?.(resizingColumnId)
	}, [resizingColumnId, onResizeStart, onResizeEnd])

	// A grid that unmounts during a drag ends it, so each start has its end.
	const endOnUnmount = useStableEvent(() => {
		const prev = prevResizingRef.current

		if (prev) onResizeEnd?.(prev)
	})

	useEffect(() => endOnUnmount, [endOnUnmount])
}
