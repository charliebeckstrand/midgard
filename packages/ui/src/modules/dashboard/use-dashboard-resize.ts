'use client'

import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { clamp } from '../../utilities'
import type { DashboardResizeEdge } from './context'
import {
	compactUp,
	deriveHeight,
	type LayoutCell,
	ROW_SUBDIVISION,
	sameGeometry,
} from './dashboard-layout'
import { type CellConstraints, minColumns } from './dashboard-responsive'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** The shortest a free-form tile resizes to: one column pitch tall. @internal */
const MIN_CELL_ROWS = ROW_SUBDIVISION

/** Options for {@link useDashboardResize}. @internal */
type DashboardResizeOptions = {
	/** The grid canvas element, read once per gesture for its direction. */
	containerRef: RefObject<HTMLDivElement | null>
	/** The cells painted at rest — the snapshot source for a new gesture. */
	rendered: LayoutCell[]
	/** Live gate: gestures only run while the rendered layout is canonical. */
	identity: boolean
	columns: number
	gap: number
	/** Measured column pitch in px; `0` disables resizing. */
	columnPitch: number
	/** Per-id content demands, for the ratio and minimum-width clamps. */
	constraints: ReadonlyMap<string, CellConstraints>
	/** Commits a preview as the canonical layout; returns the emitted items. */
	commit: (cells: readonly LayoutCell[]) => DashboardGestureEndEvent['layout']
	/** The canonical layout in public shape, for the event payloads. */
	publicLayout: DashboardGestureStartEvent['layout']
	onResizeStart?: (event: DashboardGestureStartEvent) => void
	onResizeEnd?: (event: DashboardGestureEndEvent) => void
}

/** What {@link useDashboardResize} returns. @internal */
type DashboardResizeState = {
	/** The resized tile's id, or `null` at rest. */
	resizingId: string | null
	/** The live preview layout, or `null` at rest — paint this over `rendered` while set. */
	preview: LayoutCell[] | null
	/** Starts a pointer resize from a handle's `pointerdown`. */
	beginResize: (id: string, edge: DashboardResizeEdge, event: ReactPointerEvent) => void
	/** One keyboard resize step, committing immediately with both event brackets. */
	resizeBy: (id: string, edge: DashboardResizeEdge, dw: number, dh: number) => void
}

/**
 * One cell resized along its edge under the tile's clamps: the width stays
 * between the content's minimum span and the columns its `x` leaves, a
 * ratio-locked height re-derives from the width (the `s` axis is inert on
 * it), and a free-form height keeps a floor of one column pitch. The grid
 * unbounded below needs no height ceiling.
 *
 * @internal
 */
function resizeCell(
	cell: LayoutCell,
	edge: DashboardResizeEdge,
	dw: number,
	dh: number,
	minW: number,
	columns: number,
	ratio: number | undefined,
): LayoutCell {
	const w = edge === 's' ? cell.w : clamp(cell.w + dw, Math.min(minW, cell.w), columns - cell.x)

	const h =
		ratio !== undefined
			? deriveHeight(w, ratio)
			: edge === 'e'
				? cell.h
				: Math.max(MIN_CELL_ROWS, cell.h + dh)

	return { ...cell, w, h }
}

/**
 * The pointer- and keyboard-resize orchestration behind the dashboard grid.
 * A pointer gesture captures a snapshot at `pointerdown` and re-simulates
 * from it on every move — the drag hook's discipline, so Escape and
 * `pointercancel` revert for free — while document-level listeners follow
 * the pointer past the tile and a `contextmenu` mid-gesture cancels rather
 * than strands it. A keyboard step commits per press, the handle's
 * `aria-valuenow` carrying the announcement.
 *
 * @internal
 */
export function useDashboardResize({
	containerRef,
	rendered,
	identity,
	columns,
	gap,
	columnPitch,
	constraints,
	commit,
	publicLayout,
	onResizeStart,
	onResizeEnd,
}: DashboardResizeOptions): DashboardResizeState {
	const [resizingId, setResizingId] = useState<string | null>(null)

	const [preview, setPreview] = useState<LayoutCell[] | null>(null)

	const previewRef = useRef(preview)

	previewRef.current = preview

	const renderedRef = useRef(rendered)

	renderedRef.current = rendered

	const identityRef = useRef(identity)

	identityRef.current = identity

	const pitchRef = useRef(columnPitch)

	pitchRef.current = columnPitch

	const publicLayoutRef = useRef(publicLayout)

	publicLayoutRef.current = publicLayout

	const constraintsRef = useRef(constraints)

	constraintsRef.current = constraints

	/** Tears down the live gesture's document listeners; `null` at rest. */
	const cleanupRef = useRef<(() => void) | null>(null)

	// Unmount mid-gesture must not leave document listeners behind.
	useEffect(() => () => cleanupRef.current?.(), [])

	const beginResize = useCallback(
		(id: string, edge: DashboardResizeEdge, event: ReactPointerEvent) => {
			const pitch = pitchRef.current

			const container = containerRef.current

			if (!identityRef.current || pitch <= 0 || container === null || cleanupRef.current) return

			const snapshot = renderedRef.current

			const origin = snapshot.find((cell) => cell.id === id)

			if (origin === undefined || origin.static) return

			event.preventDefault()

			const demands = constraintsRef.current.get(id)

			const minW =
				demands?.minWidth === undefined ? 1 : minColumns(demands.minWidth, gap, pitch, columns)

			const start = { x: event.clientX, y: event.clientY }

			// Deltas read physically; a right-to-left grid mirrors the horizontal.
			const flip = getComputedStyle(container).direction === 'rtl' ? -1 : 1

			let lastKey = ''

			const move = (pointer: PointerEvent) => {
				const dw = Math.round((flip * (pointer.clientX - start.x)) / pitch)

				const dh = Math.round((pointer.clientY - start.y) / (pitch / ROW_SUBDIVISION))

				const next = resizeCell(origin, edge, dw, dh, minW, columns, demands?.ratio)

				const key = `${next.w}x${next.h}`

				if (key === lastKey) return

				lastKey = key

				setPreview(compactUp(snapshot.map((cell) => (cell.id === id ? next : { ...cell }))))
			}

			const settle = (canceled: boolean) => {
				cleanupRef.current?.()

				const result = previewRef.current

				setResizingId(null)

				setPreview(null)

				const changed =
					!canceled && result !== null && identityRef.current && !sameGeometry(result, snapshot)

				if (changed) {
					const layout = commit(result)

					onResizeEnd?.({ id, canceled: false, layout })
				} else {
					onResizeEnd?.({ id, canceled: true, layout: publicLayoutRef.current })
				}
			}

			const drop = () => settle(false)

			const cancel = () => settle(true)

			const key = (keyboard: KeyboardEvent) => {
				if (keyboard.key === 'Escape') cancel()
			}

			document.addEventListener('pointermove', move)

			document.addEventListener('pointerup', drop)

			document.addEventListener('pointercancel', cancel)

			document.addEventListener('contextmenu', cancel)

			document.addEventListener('keydown', key)

			cleanupRef.current = () => {
				cleanupRef.current = null

				document.removeEventListener('pointermove', move)

				document.removeEventListener('pointerup', drop)

				document.removeEventListener('pointercancel', cancel)

				document.removeEventListener('contextmenu', cancel)

				document.removeEventListener('keydown', key)
			}

			setResizingId(id)

			onResizeStart?.({ id, layout: publicLayoutRef.current })
		},
		[containerRef, columns, gap, commit, onResizeStart, onResizeEnd],
	)

	const resizeBy = useCallback(
		(id: string, edge: DashboardResizeEdge, dw: number, dh: number) => {
			const pitch = pitchRef.current

			if (!identityRef.current || pitch <= 0) return

			const base = renderedRef.current

			const origin = base.find((cell) => cell.id === id)

			if (origin === undefined || origin.static) return

			const demands = constraintsRef.current.get(id)

			const minW =
				demands?.minWidth === undefined ? 1 : minColumns(demands.minWidth, gap, pitch, columns)

			const next = compactUp(
				base.map((cell) =>
					cell.id === id
						? resizeCell(origin, edge, dw, dh, minW, columns, demands?.ratio)
						: { ...cell },
				),
			)

			if (sameGeometry(next, base)) return

			onResizeStart?.({ id, layout: publicLayoutRef.current })

			const layout = commit(next)

			onResizeEnd?.({ id, canceled: false, layout })
		},
		[columns, gap, commit, onResizeStart, onResizeEnd],
	)

	return { resizingId, preview, beginResize, resizeBy }
}
