'use client'

import { type KeyboardEvent, type PointerEvent, useLayoutEffect, useRef } from 'react'
import { dataAttr } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { Splitter } from '../../primitives/splitter/splitter'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardActions } from './context'
import { dashboardMessages } from './dashboard-messages'
import type { DashboardCell } from './engine/dashboard-layout'
import type { DashboardResizeEdge, DashboardResizeRange } from './engine/dashboard-resize'

/** Props for {@link DashboardResizeHandle}. @internal */
export type DashboardResizeHandleProps = {
	/** The id of the tile. */
	id: string
	/** The edge that the handle drives. */
	edge: DashboardResizeEdge
	/** The painted cell of the tile. */
	cell: DashboardCell
	/** The spans that a resize of the tile can reach. The splitter reports them, widened to hold the span of the cell. */
	range: DashboardResizeRange
	/** The name of the tile, for the accessible name of the splitter. */
	label: string
	/** Whether this tile resizes now. */
	resizing: boolean
}

/** The arrow keys that step each edge, as a change of width and height in grid units. */
const STEPS: Record<string, readonly [number, number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
}

/**
 * One resize splitter of a tile in edit mode. A pointer drag resizes the tile
 * live; the arrow keys on a focused splitter step it by one grid unit and commit
 * at once. After each step, the focused splitter scrolls into view, so its focus
 * ring stays on screen. The corner takes the pointer only, because the two edges
 * already serve the keyboard. Each edge reports the span on its axis, and the
 * range that the limits of the tile allow.
 *
 * @remarks
 * A saved span can be outside the limits, because the saved layout renders as
 * saved. The reported range then widens to hold the span, so the value never
 * falls outside it. The resize still clamps into the limits.
 *
 * @internal
 */
export function DashboardResizeHandle({
	id,
	edge,
	cell,
	range,
	label,
	resizing,
}: DashboardResizeHandleProps) {
	const intl = useIntl()

	const { beginResize, resizeBy } = useDashboardActions()

	const horizontal = edge === 's'

	const span = horizontal ? cell.h : cell.w

	const least = Math.min(horizontal ? range.minH : range.minW, span)

	// The south edge of a free-form tile has no most height unless the tile sets one.
	const most = horizontal ? range.maxH : range.maxW

	const ref = useRef<HTMLHRElement>(null)

	// The span of the last check, so the scroll below runs on a new span only.
	const checkedSpan = useRef(span)

	// A keyboard step changes the span and not the scroll, so a step can push the focused
	// splitter past the fold. A pointer resize skips the scroll, because its edge follows the
	// pointer through a scroll, and the scroll then changes the span again.
	useLayoutEffect(() => {
		if (checkedSpan.current === span) return

		checkedSpan.current = span

		const el = ref.current

		if (resizing || el === null || el !== document.activeElement) return

		el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [span, resizing])

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const step = STEPS[event.key]

		if (step === undefined) return

		const [dw, dh] = step

		if ((horizontal ? dh : dw) === 0) return

		event.preventDefault()

		resizeBy(id, edge, dw, dh)
	}

	const shared = {
		'data-slot': 'dashboard-resize-handle',
		'data-edge': edge,
		'data-resizing': dataAttr(resizing),
		className: k({ edge }).resize.handle,
		onPointerDown: (event: PointerEvent<HTMLElement>) => beginResize(id, edge, event),
	}

	if (edge === 'se') return <div {...shared} aria-hidden />

	return (
		<Splitter
			{...shared}
			ref={ref}
			label={intl.formatMessage(dashboardMessages.resize, { label })}
			orientation={horizontal ? 'horizontal' : 'vertical'}
			value={span}
			min={least}
			max={most === undefined ? undefined : Math.max(most, span)}
			onKeyDown={onKeyDown}
		/>
	)
}
