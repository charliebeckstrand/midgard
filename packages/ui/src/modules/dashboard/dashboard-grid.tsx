'use client'

import { DndContext } from '@dnd-kit/core'
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { useGrabbingCursor, useResizeObserver } from '../../hooks'
import { k } from '../../recipes/kata/dashboard'
import type { AccessibleName } from '../../types'
import { DashboardContext, type DashboardContextValue } from './context'
import { bottom, DEFAULT_COLUMNS, ROW_SUBDIVISION } from './dashboard-layout'
import { projectLayout } from './dashboard-responsive'
import type {
	DashboardGestureEndEvent,
	DashboardGestureStartEvent,
	DashboardLayoutBinding,
} from './types'
import { useDashboardDrag } from './use-dashboard-drag'
import { useDashboardLayout } from './use-dashboard-layout'
import { useDashboardResize } from './use-dashboard-resize'

/** The default gutter between tiles, px. @internal */
const DEFAULT_GAP = 8

/** A percentage of the grid's span, carried at enough precision to stay sub-pixel. @internal */
function pct(fraction: number): string {
	return `${(fraction * 100).toFixed(4)}%`
}

/**
 * Props for {@link DashboardGrid}. Requires an accessible name (`aria-label`
 * or `aria-labelledby`) — the grid is a landmark region of tiles.
 */
export type DashboardGridProps = AccessibleName & {
	/**
	 * The layout binding, on the `value` / `defaultValue` / `onValueChange`
	 * triad. Omitted, the grid runs uncontrolled: mounted items auto-slot
	 * below one another in mount order. Fires on every committed mutation;
	 * ratio-locked items emit without `h`.
	 */
	layout?: DashboardLayoutBinding
	/**
	 * Editing mode: the column guides draw, every tile grows a drag grip (in
	 * its chart's header when one adopts it, floated on the corner otherwise)
	 * and resize splitters. Nothing else shifts — the layout holds still
	 * until a gesture moves it — and toggling editing never changes the
	 * canvas height, so the charts never reflow on the switch. While the
	 * responsive projection is active (the container too narrow for some
	 * tile's `minWidth`), editing stands down whatever this prop says:
	 * gestures apply to the canonical layout, which is not the one on screen.
	 * @defaultValue false
	 */
	editing?: boolean
	/**
	 * Column count. The default divides into halves, thirds, quarters, sixths,
	 * and eighths — and matches Grafana's grid, so imported layouts translate.
	 * @defaultValue 24
	 */
	columns?: number
	/**
	 * The gutter between tiles in px, rendered as a half-gap inset inside each
	 * cell so the grid's geometry stays purely proportional.
	 * @defaultValue 8
	 */
	gap?: number
	/** Fires as a tile's drag lifts, with the layout the gesture reverts to. */
	onDragStart?: (event: DashboardGestureStartEvent) => void
	/** Fires as a drag settles — committed or `canceled` (Escape, no-op drop). */
	onDragEnd?: (event: DashboardGestureEndEvent) => void
	/** Fires as a resize gesture begins, with the layout it reverts to. */
	onResizeStart?: (event: DashboardGestureStartEvent) => void
	/** Fires as a resize settles — committed or `canceled`. */
	onResizeEnd?: (event: DashboardGestureEndEvent) => void
	className?: string
	/** The tiles: `DashboardItem` elements keyed by their layout ids. */
	children?: ReactNode
}

/**
 * A dashboard canvas: draggable, resizable tiles over a fixed column
 * count, each sitting exactly where it was placed — the board never
 * repacks, so what you save is literally what renders. Geometry is purely
 * proportional — positions and sizes are percentages of the grid's own
 * width, rows a quarter of a column's pitch — so a saved layout renders
 * identically at every container width and server-side markup is already
 * correct before any measurement. Tiles declaring a `ratio` derive their
 * height from their width: two or three side by side at equal spans hold
 * exactly equal heights.
 *
 * Below the width the layout stays legible at, the board turns responsive
 * on the tiles' own terms: once the container drops any tile's content box
 * under its `minWidth`, the canvas paints a content-first projection of the
 * same layout — starved tiles widen to the span their content demands and
 * the board re-packs in reading order, converging on a full-width stack.
 * There is no breakpoint and nothing is saved: the projection is a view,
 * the binding never fires from it, and the canonical layout returns
 * verbatim — gaps included — the moment the container affords it. Editing
 * stands down while the projection is active, since gestures apply to the
 * canonical cells rather than the ones on screen.
 *
 * Dragging reorders against an equal-span tile it mostly covers, previewed
 * live: a partner in the same row shifts that row's run open to receive the
 * tile, a partner on another row trades places, and anywhere else the drop
 * is blocked and nothing changes. Only the tiles the reorder names ever
 * move, nothing on the board moves on its own initiative, and a drag never
 * grows the canvas — only mounting more tiles does. A resize grows only
 * until it meets a neighbour or the board edge.
 *
 * @remarks Set {@link DashboardGridProps.editing | editing} to make it
 * mutable — at rest the grid is inert chrome around its tiles.
 * @example
 * ```tsx
 * <DashboardGrid aria-label="Sales overview" editing={editing} layout={{ defaultValue: saved, onValueChange: persist }}>
 *   <DashboardItem id="revenue" ratio={16 / 9}>
 *     <BarChart header="Revenue" aspectRatio={false} … />
 *   </DashboardItem>
 * </DashboardGrid>
 * ```
 */
export function DashboardGrid({
	layout,
	editing = false,
	columns = DEFAULT_COLUMNS,
	gap = DEFAULT_GAP,
	onDragStart,
	onDragEnd,
	onResizeStart,
	onResizeEnd,
	className,
	children,
	...label
}: DashboardGridProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	const [containerWidth, setContainerWidth] = useState(0)

	// A gesture may grow the canvas to open a new row; that height change must
	// never loop back into the width. If the taller canvas trips a page
	// scrollbar, the container narrows and the observer fires — so width is
	// frozen for the duration of a gesture (the window is not being resized
	// then) and re-measured once it settles.
	const gesturingRef = useRef(false)

	useResizeObserver(
		containerRef,
		useCallback(() => {
			const element = containerRef.current

			if (element && !gesturingRef.current) setContainerWidth(element.clientWidth)
		}, []),
	)

	const { register, rendered, constraints, commit, publicLayout } = useDashboardLayout({
		layout,
		columns,
	})

	const columnPitch = containerWidth > 0 ? containerWidth / columns : 0

	// The responsive projection: once the container drops any tile under its
	// registered minWidth, the board paints a re-packed, content-first view of
	// the same layout. The constraint registry is a stable ref whose changes
	// re-derive `rendered`, so these deps cover it.
	const projection = useMemo(
		() => projectLayout(rendered, { containerWidth, gap, columns, constraints }),
		[rendered, containerWidth, gap, columns, constraints],
	)

	// While the projection is active, editing stands down entirely: gestures
	// simulate and commit canonical cells, which are not the ones on screen —
	// there is no honest way to map "swap with the tile below" back through a
	// re-packed view. The width freeze below keeps the projection from
	// flipping mid-gesture, so a live gesture is never cut off.
	const editable = editing && projection.identity

	const projected = !projection.identity

	// A responsive re-pack snaps rather than glides. The tile's cell transition
	// is the drag-reflow glide; a re-pack is a wholesale layout change, and
	// animating it would let a fill chart inside — which commits its measured
	// size a frame late — track a visibly wrong size across the whole 200ms.
	// Held one frame past the return to the canonical layout (the same posture
	// as a tile's drop snap), so the snap back reads instant too.
	const [settling, setSettling] = useState(false)

	const wasProjected = useRef(projected)

	useLayoutEffect(() => {
		if (projected === wasProjected.current) return

		wasProjected.current = projected

		setSettling(true)

		const frame = requestAnimationFrame(() => setSettling(false))

		return () => cancelAnimationFrame(frame)
	}, [projected])

	const repacking = projected || settling

	const drag = useDashboardDrag({
		rendered,
		columns,
		columnPitch,
		commit,
		publicLayout,
		onDragStart,
		onDragEnd,
	})

	const resize = useDashboardResize({
		containerRef,
		rendered,
		columns,
		gap,
		columnPitch,
		constraints,
		commit,
		publicLayout,
		onResizeStart,
		onResizeEnd,
	})

	useGrabbingCursor(drag.activeId !== null)

	// The painted layout: a live gesture's preview wins over the resting one,
	// so displaced tiles glide to the simulation as it changes.
	const gesturing = drag.activeId !== null || resize.resizingId !== null

	// Freeze the width measurement while a gesture runs; re-sync the true
	// width the frame a gesture ends, in case a scrollbar came or went with
	// the canvas height in between.
	useLayoutEffect(() => {
		gesturingRef.current = gesturing

		if (!gesturing && containerRef.current) setContainerWidth(containerRef.current.clientWidth)
	}, [gesturing])

	const paint =
		drag.preview ?? resize.preview ?? (projection.identity ? rendered : projection.cells)

	// The dragged tile paints at its resting origin, not its preview cell:
	// dnd-kit measures the pointer offset from where the node started, so the
	// node must hold still and only transform. The preview drives where its
	// neighbours reflow and where the drop placeholder falls.
	const dragOrigin =
		drag.activeId !== null ? (rendered.find((cell) => cell.id === drag.activeId) ?? null) : null

	const placeholderCell =
		drag.activeId !== null && drag.preview !== null
			? drag.preview.find((cell) => cell.id === drag.activeId)
			: undefined

	const cells = useMemo(() => {
		const map = new Map(paint.map((cell) => [cell.id, cell]))

		if (dragOrigin !== null) map.set(dragOrigin.id, dragOrigin)

		return map
	}, [paint, dragOrigin])

	// The proportional height denominator; floored one column pitch tall so an
	// empty grid still draws its editing frame. During a gesture the resting
	// height also floors it: a preview may grow the canvas to receive a
	// new-row drop, but never shrink it under the pointer — a pumping bottom
	// edge reads as jitter.
	const maxRow = Math.max(bottom(paint), gesturing ? bottom(rendered) : 0, ROW_SUBDIVISION)

	const context = useMemo<DashboardContextValue>(
		() => ({
			editing: editable,
			repacking,
			columns,
			gap,
			maxRow,
			cells,
			columnPitch,
			register,
			activeId: drag.activeId,
			resizingId: resize.resizingId,
			beginResize: resize.beginResize,
			resizeBy: resize.resizeBy,
		}),
		[
			editable,
			repacking,
			columns,
			gap,
			maxRow,
			cells,
			columnPitch,
			register,
			drag.activeId,
			resize.resizingId,
			resize.beginResize,
			resize.resizeBy,
		],
	)

	return (
		<DashboardContext value={context}>
			<DndContext {...drag.dndContextProps}>
				<section
					ref={containerRef}
					{...label}
					data-slot="dashboard-grid"
					data-editing={dataAttr(editable)}
					className={cn(k.base, k.guides(editable), className)}
					style={{
						// Height rides the width: maxRow rows at a quarter column each.
						aspectRatio: `${columns * ROW_SUBDIVISION} / ${maxRow}`,
						...(editable && { backgroundSize: `calc(100% / ${columns}) 100%` }),
					}}
				>
					{placeholderCell !== undefined && (
						<div
							data-slot="dashboard-placeholder"
							className={cn(
								'absolute transition-[left,top,width,height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
							)}
							style={{
								left: pct(placeholderCell.x / columns),
								top: pct(placeholderCell.y / maxRow),
								width: pct(placeholderCell.w / columns),
								height: pct(placeholderCell.h / maxRow),
								padding: gap / 2,
							}}
						>
							<div className={cn(k.placeholder)} />
						</div>
					)}

					{children}
				</section>
			</DndContext>
		</DashboardContext>
	)
}
