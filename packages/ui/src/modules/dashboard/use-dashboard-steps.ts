'use client'

import { type RefObject, useCallback } from 'react'
import { announce } from '../../core/announcer'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { type DashboardCommit, measureGesture } from './dashboard-gesture'
import { describeMoved, describeResized, describeStackMove } from './engine/dashboard-announcements'
import { type DashboardStep, stackPreview, stepPreview } from './engine/dashboard-drag'
import { type DashboardCell, readingOrder } from './engine/dashboard-layout'
import { stepSpan } from './engine/dashboard-resize'
import type { DashboardStore } from './engine/dashboard-store'
import { resizeContext } from './use-dashboard-resize'

/**
 * One item of the menu of a tile. The four moves name the side of the screen,
 * and the four size steps name the span that changes.
 *
 * @internal
 */
export type DashboardTileStep =
	| 'left'
	| 'right'
	| 'up'
	| 'down'
	| 'wider'
	| 'narrower'
	| 'taller'
	| 'shorter'

/** The items of the menu of a tile, in menu order. @internal */
export const TILE_STEPS: readonly DashboardTileStep[] = [
	'left',
	'right',
	'up',
	'down',
	'wider',
	'narrower',
	'taller',
	'shorter',
]

/** The change of span of each size step, as columns and rows. */
const SPANS: Partial<Record<DashboardTileStep, readonly [number, number]>> = {
	wider: [1, 0],
	narrower: [-1, 0],
	taller: [0, 1],
	shorter: [0, -1],
}

/** What one step does: the cells to commit, and the sentence of the live region. */
type DashboardStepPlan = { cells: DashboardCell[]; say: () => string }

/** Options for {@link useDashboardSteps}. @internal */
export type DashboardStepsOptions = {
	/** The store of the dashboard. */
	store: DashboardStore
	/** The canvas element, which gives the pitch and the inline direction. */
	canvasRef: RefObject<HTMLElement | null>
	/** Commits the cells of a step, and returns what the commit leaves. */
	commit: (cells: readonly DashboardCell[]) => DashboardCommit
}

/** What {@link useDashboardSteps} returns. @internal */
export type DashboardStepHandlers = {
	/** The steps that change the board for the tile `id` now, in menu order. */
	tileSteps: (id: string) => DashboardTileStep[]
	/** Runs one step of the tile `id`, commits it at once, and tells the live region. */
	stepTile: (id: string, step: DashboardTileStep) => void
}

/** The move of one step in grid units. The left and right moves follow the screen. */
function moveStep(step: DashboardTileStep, inline: 1 | -1): DashboardStep | null {
	switch (step) {
		case 'left':
			return { axis: 'x', sign: inline === 1 ? -1 : 1 }
		case 'right':
			return { axis: 'x', sign: inline }
		case 'up':
			return { axis: 'y', sign: -1 }
		case 'down':
			return { axis: 'y', sign: 1 }
		default:
			return null
	}
}

/** The plan of one size step of the tile `id`, or `null` when the step changes nothing. */
function planSize(
	store: DashboardStore,
	canvas: HTMLElement | null,
	id: string,
	[dw, dh]: readonly [number, number],
	intl: IntlShape,
	label: string,
): DashboardStepPlan | null {
	const context = resizeContext(store, canvas, id)

	const cells = context && stepSpan(context.snapshot, id, dw, dh, context.limits)

	const cell = cells?.find((item) => item.id === id)

	if (!cells || cell === undefined) return null

	const axis = dw === 0 ? 'rows' : 'columns'

	return { cells, say: () => describeResized(intl, label, axis, cell) }
}

/**
 * The plan of one move of the tile `id`, or `null` when the move changes
 * nothing. In the re-pack, "up" and "down" move the tile one place in reading
 * order, and the tile has no other move.
 */
function planMove(
	store: DashboardStore,
	canvas: HTMLElement | null,
	id: string,
	step: DashboardTileStep,
	intl: IntlShape,
	label: string,
): DashboardStepPlan | null {
	const measure = measureGesture(store, 'drag', canvas)

	const move = measure && moveStep(step, measure.inline)

	if (measure === null || move === null) return null

	const { snapshot, view } = measure

	const { columns } = store.getState()

	if (view.projected) {
		if (move.axis !== 'y') return null

		const order = readingOrder(snapshot)

		const index = order.indexOf(id) + move.sign

		const cells = stackPreview(snapshot, id, index, columns)

		const place = { position: index + 1, total: order.length }

		return cells && { cells, say: () => describeStackMove(intl, label, place) }
	}

	const preview = stepPreview(snapshot, id, move, columns)

	const cell = preview?.cells.find((item) => item.id === id)

	if (!preview || cell === undefined) return null

	return { cells: preview.cells, say: () => describeMoved(intl, label, cell, columns) }
}

/**
 * The steps of the menu of a tile: a single-pointer path to each move and each
 * resize that a drag gives (WCAG 2.2 SC 2.5.7, and the Equivalent exception of
 * SC 2.5.8 for the thin splitters). Each step reads the board when it runs, and
 * it commits at once, as a keyboard step of a splitter does.
 *
 * A move takes the tile to the nearest place on its own row or column, in the
 * direction of the step, that a drag there gives ({@link stepPreview}). In the
 * re-pack of a narrow board, "up" and "down" move the tile one place in reading
 * order, as the arrow keys do, and the tile has no other step. A size step adds
 * or takes one grid unit, inside the limits of the tile ({@link stepSpan}).
 *
 * A step is refused while a gesture owns the board, as a second gesture is.
 *
 * @internal
 */
export function useDashboardSteps({
	store,
	canvasRef,
	commit,
}: DashboardStepsOptions): DashboardStepHandlers {
	const intl = useIntl()

	const commitCells = useStableEvent(commit)

	const plan = useCallback(
		(id: string, step: DashboardTileStep): DashboardStepPlan | null => {
			const label = store.getState().demands.get(id)?.label ?? id

			const span = SPANS[step]

			return span === undefined
				? planMove(store, canvasRef.current, id, step, intl, label)
				: planSize(store, canvasRef.current, id, span, intl, label)
		},
		[store, canvasRef, intl],
	)

	const tileSteps = useCallback(
		(id: string) => TILE_STEPS.filter((step) => plan(id, step) !== null),
		[plan],
	)

	const stepTile = useCallback(
		(id: string, step: DashboardTileStep) => {
			const next = plan(id, step)

			if (next === null) return

			const { kept, failure } = commitCells(next.cells)

			if (kept) announce(next.say())

			if (failure !== undefined) throw failure.error
		},
		[plan, commitCells],
	)

	return { tileSteps, stepTile }
}
