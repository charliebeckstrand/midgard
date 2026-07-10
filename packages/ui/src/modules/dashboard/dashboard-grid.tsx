'use client'

import { DndContext, DragOverlay } from '@dnd-kit/core'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { useGrabbingCursor, useResizeObserver } from '../../hooks'
import { DragHandleContext, type DragHandleContextValue } from '../../primitives/drag-handle'
import { k } from '../../recipes/kata/dashboard'
import type { AccessibleName } from '../../types'
import { DashboardContext, type DashboardContextValue } from './context'
import { DashboardHandle } from './dashboard-handle'
import { bottom, DEFAULT_COLUMNS, ROW_SUBDIVISION } from './dashboard-layout'
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

/**
 * Props for {@link DashboardGrid}. Requires an accessible name (`aria-label`
 * or `aria-labelledby`) — the grid is a landmark region of tiles.
 */
export type DashboardGridProps = AccessibleName & {
	/**
	 * The layout binding, on the `value` / `defaultValue` / `onValueChange`
	 * triad. Omitted, the grid runs uncontrolled: mounted items auto-slot in
	 * mount order and compaction keeps them packed. Fires on every committed
	 * mutation; ratio-locked items emit without `h`.
	 */
	layout?: DashboardLayoutBinding
	/**
	 * Editing mode: the column guides draw, every tile grows a drag grip (in
	 * its chart's header when one adopts it, floated on the corner otherwise)
	 * and resize splitters, and nothing else shifts — the layout holds still
	 * until a gesture moves it. While the responsive derivation is reshaping a
	 * narrow container, gestures stand down: edits apply to the saved layout,
	 * so they are only offered while it is exactly what renders.
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
 * A Grafana-style dashboard grid: draggable, resizable tiles over a fixed
 * column count, gravity pulling everything to the top. Geometry is purely
 * proportional — positions and sizes are percentages of the grid's own
 * width, rows a quarter of a column's pitch — so a saved layout renders
 * identically at every container width and server-side markup is already
 * correct before any measurement. Tiles declaring a `ratio` derive their
 * height from their width: two or three side by side at equal spans hold
 * exactly equal heights. In a container too narrow for a tile's `minWidth`,
 * the layout re-derives — tiles widen and wrap, breakpoint-free — while the
 * saved layout stays untouched. Dropping a tile on another's middle swaps
 * them; toward its top or bottom edge opens the gap there instead; removal
 * slides what sat below back up.
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

	useResizeObserver(
		containerRef,
		useCallback(() => {
			const element = containerRef.current

			if (element) setContainerWidth(element.clientWidth)
		}, []),
	)

	const { register, rendered, identity, constraints, commit, publicLayout } = useDashboardLayout({
		layout,
		columns,
		gap,
		containerWidth,
	})

	const columnPitch = containerWidth > 0 ? containerWidth / columns : 0

	const drag = useDashboardDrag({
		containerRef,
		rendered,
		identity,
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
		identity,
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

	// The painted layout: a live gesture's preview wins over the resting
	// derivation, so every tile glides to the simulation as it changes.
	const gesturing = drag.activeId !== null || resize.resizingId !== null

	const paint = drag.preview ?? resize.preview ?? rendered

	const cells = useMemo(() => new Map(paint.map((cell) => [cell.id, cell])), [paint])

	// The proportional height denominator; floored one column pitch tall so an
	// empty grid still draws its editing frame. During a gesture the resting
	// height also floors it: a preview may grow the grid to receive a drop at
	// the bottom, but never shrink it under the pointer — a pumping bottom
	// edge reads as jitter.
	const maxRow = Math.max(bottom(paint), gesturing ? bottom(rendered) : 0, ROW_SUBDIVISION)

	const editingLive = editing && identity

	const overlay = useRef(new Map<string, ReactNode>())

	// The decorative handle the drag overlay's clone adopts: same grip, no
	// gesture, a claim that registers nothing — purely so the cloned header
	// keeps its shape while the real handle's tile is hidden behind it.
	const overlayHandle = useMemo<DragHandleContextValue>(
		() => ({ handle: <DashboardHandle label="" />, claim: () => () => {} }),
		[],
	)

	const context = useMemo<DashboardContextValue>(
		() => ({
			editing: editingLive,
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
			overlay,
		}),
		[
			editingLive,
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
					data-editing={dataAttr(editing)}
					className={cn(k.base, k.guides(editingLive), className)}
					style={{
						// Height rides the width: maxRow rows at a quarter column each.
						aspectRatio: `${columns * ROW_SUBDIVISION} / ${maxRow}`,
						...(editingLive && { backgroundSize: `calc(100% / ${columns}) 100%` }),
					}}
				>
					{children}
				</section>

				{editing && (
					<DragOverlay dropAnimation={null}>
						{drag.activeId !== null && (
							<div data-slot="dashboard-overlay" className="size-full" style={{ padding: gap / 2 }}>
								{/* The overlay clone keeps the same ambient handle its header
								    already adopted — inert, so the grip holds its place and the
								    title never reflows mid-drag. */}
								<DragHandleContext value={overlayHandle}>
									<div className={cn(k.content({ editing: true }))}>
										{overlay.current.get(drag.activeId)}
									</div>
								</DragHandleContext>
							</div>
						)}
					</DragOverlay>
				)}
			</DndContext>
		</DashboardContext>
	)
}
