'use client'

import { useDraggable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { DragHandleContext, type DragHandleContextValue } from '../../primitives/drag-handle'
import { TileSurfaceContext } from '../../primitives/tile-surface'
import { k } from '../../recipes/kata/dashboard'
import { clamp } from '../../utilities'
import { useDashboard } from './context'
import { DashboardHandle } from './dashboard-handle'
import { type LayoutCell, ROW_SUBDIVISION } from './dashboard-layout'
import { DashboardResizeHandle } from './dashboard-resize-handle'

/**
 * The minimum content width a tile defaults to, in px — roughly the floor a
 * legended chart stays legible at.
 *
 * @internal
 */
const DEFAULT_MIN_WIDTH = 320

/** Props for {@link DashboardItem}. */
export type DashboardItemProps = {
	/** Stable id joining this tile to its layout entry. */
	id: string
	/**
	 * Locks the tile's content box to a `width / height` ratio — `16 / 9` for
	 * a chart tile. The saved layout then stores no height at all: it derives
	 * from the width, so tiles sharing a ratio and a width render exactly the
	 * same height, side by side or apart. Omitted, the tile is free-form and
	 * resizes on both axes.
	 */
	ratio?: number
	/**
	 * The narrowest the content stays legible, in px — one line read from two
	 * sides. It clamps how far the tile resizes down, and it is the tile's
	 * vote in the grid's responsive projection: once the container renders
	 * this tile narrower, the board re-packs so it never is.
	 * @defaultValue 320
	 */
	minWidth?: number
	children?: ReactNode
}

/** A percentage of the grid's span, carried at enough precision to stay sub-pixel. @internal */
function pct(fraction: number): string {
	return `${(fraction * 100).toFixed(4)}%`
}

/**
 * The readout chipped onto a tile while it resizes: its span in grid units
 * and the content box in px, both live from the preview.
 *
 * @internal
 */
function resizeReadout(cell: LayoutCell, columnPitch: number, gap: number): string {
	const width = Math.max(0, Math.round(cell.w * columnPitch - gap))

	const height = Math.max(0, Math.round((cell.h * columnPitch) / ROW_SUBDIVISION - gap))

	return `${cell.w} × ${cell.h} · ${width} × ${height} px`
}

/**
 * One dashboard tile: the positioned shell its content renders into. It
 * registers its content demands (`ratio`, `minWidth`) with the grid and
 * paints at its cell through pure percentage geometry, SSR-correct at any
 * width. A change of cell eases on a CSS transition, so a tile a drag
 * displaces glides to its new spot with no animation runtime in the loop —
 * and because nothing re-renders through that transition, a chart header
 * inside never re-measures and so never jitters. A responsive re-pack drops
 * that glide (`repacking`): the board jumps to fit its container in one
 * frame rather than animating a sweep a fill chart would lag a wrong size
 * across.
 *
 * The tile drags itself — there is no overlay clone. In editing mode it
 * mints the drag grip and broadcasts it through the ambient
 * `DragHandleContext`: a chart header inside adopts and claims it, and while
 * nothing claims, the same grip floats on the tile's corner. While it is
 * the dragged tile it drops the cell transition and tracks the pointer
 * through a `translate` transform; on release the transition returns and
 * that transform eases to zero exactly as its landing cell eases into place
 * under it — the two read as one motion into the slot, never a teleport.
 * Its east edge (south too, free-form) carries a resize splitter.
 *
 * @remarks Keep `children` referentially stable (hoist or memoize heavy
 * content): the shell re-renders each frame of a drag, and a stable element
 * lets React bail out of the content subtree so the chart never re-renders
 * mid-drag.
 */
export function DashboardItem({
	id,
	ratio,
	minWidth = DEFAULT_MIN_WIDTH,
	children,
}: DashboardItemProps) {
	const {
		editing,
		repacking,
		columns,
		gap,
		maxRow,
		cells,
		columnPitch,
		register,
		activeId,
		resizingId,
	} = useDashboard()

	useLayoutEffect(() => register(id, { ratio, minWidth }), [register, id, ratio, minWidth])

	const cell = cells.get(id)

	const interactive = editing && cell !== undefined && !cell.static

	const { attributes, listeners, transform, setNodeRef, setActivatorNodeRef } = useDraggable({
		id,
		disabled: !interactive,
	})

	const dragging = activeId === id

	const resizing = resizingId === id

	// The drop is a snap, not a glide: the tile follows the pointer freely
	// through the drag, then lands in its cell with the transition suppressed
	// for the one frame the release commits — so it settles exactly where the
	// board shows it, never drifting in from the direction it came. (A glide
	// would always carry the sub-cell gap between the free pointer and the
	// grid, visible even on a drop that looks precise.) The flag clears on the
	// next frame, restoring the transition for ordinary reflow.
	const [dropping, setDropping] = useState(false)

	const wasDragging = useRef(dragging)

	useLayoutEffect(() => {
		const released = wasDragging.current && !dragging

		wasDragging.current = dragging

		if (!released) return

		setDropping(true)

		const frame = requestAnimationFrame(() => setDropping(false))

		return () => cancelAnimationFrame(frame)
	}, [dragging])

	// The adoption count: a chart header claiming the handle stands the
	// floating fallback down. Child layout effects run before this shell
	// paints, so the fallback never flashes.
	const [claims, setClaims] = useState(0)

	const claim = useCallback(() => {
		setClaims((count) => count + 1)

		return () => setClaims((count) => Math.max(0, count - 1))
	}, [])

	const handleValue = useMemo<DragHandleContextValue | null>(() => {
		if (!interactive) return null

		return {
			handle: (
				<DashboardHandle
					attributes={attributes}
					listeners={listeners}
					setActivatorNodeRef={setActivatorNodeRef}
					label={`Move ${id}`}
				/>
			),
			claim,
		}
	}, [interactive, attributes, listeners, setActivatorNodeRef, id, claim])

	if (cell === undefined) return null

	// The pointer offset, confined to the canvas. Clamped here against the
	// tile's own rendered geometry — its resting cell plus this transform kept
	// inside `[0, columns] × [0, maxRow]` in px — so a tile can never be
	// dragged past an edge or below the board, whatever raw offset dnd-kit
	// hands back. Gated on our own `dragging` flag, not dnd-kit's transform,
	// so it zeroes in the same render the cell commits; with the transition
	// suppressed that frame (`data-dropping`), the tile snaps home.
	const rowPitch = columnPitch / ROW_SUBDIVISION

	const tx = dragging
		? clamp(transform?.x ?? 0, -cell.x * columnPitch, (columns - cell.w - cell.x) * columnPitch)
		: 0

	const ty = dragging
		? clamp(transform?.y ?? 0, -cell.y * rowPitch, (maxRow - cell.h - cell.y) * rowPitch)
		: 0

	return (
		<div
			ref={setNodeRef}
			data-slot="dashboard-item"
			data-dragging={dataAttr(dragging)}
			data-dropping={dataAttr(dropping)}
			data-repacking={dataAttr(repacking)}
			data-static={dataAttr(cell.static)}
			className={cn(k.item({ dragging, lifted: resizing }))}
			style={{
				left: pct(cell.x / columns),
				top: pct(cell.y / maxRow),
				width: pct(cell.w / columns),
				height: pct(cell.h / maxRow),
				padding: gap / 2,
				transform: `translate3d(${tx}px, ${ty}px, 0)`,
			}}
		>
			<motion.div
				// A layout root scopes the content's own layout animations — the
				// chart header's title slide and adornment pops — to this box. It
				// resolves them against itself, and `layoutRoot` settles its own
				// layout instantly, so the tile moving, resizing, or reflowing (all
				// driven by CSS on the shell above) never reads as the header's
				// content shifting and never fires its motion.
				layout
				layoutRoot
				data-slot="dashboard-item-content"
				className={cn(k.content({ editing, dragging }))}
			>
				<TileSurfaceContext value={true}>
					<DragHandleContext value={handleValue}>{children}</DragHandleContext>
				</TileSurfaceContext>

				{handleValue !== null && claims === 0 && (
					<DashboardHandle
						attributes={attributes}
						listeners={listeners}
						setActivatorNodeRef={setActivatorNodeRef}
						label={`Move ${id}`}
						floating
					/>
				)}

				{interactive && (
					<>
						<DashboardResizeHandle id={id} edge="e" cell={cell} minWidth={minWidth} />

						{ratio === undefined && (
							<DashboardResizeHandle id={id} edge="s" cell={cell} minWidth={minWidth} />
						)}

						<DashboardResizeHandle id={id} edge="se" cell={cell} minWidth={minWidth} />
					</>
				)}

				{resizing && (
					<div
						data-slot="dashboard-resize-readout"
						className={cn(k.readout, 'absolute bottom-2 right-2')}
					>
						{resizeReadout(cell, columnPitch, gap)}
					</div>
				)}
			</motion.div>
		</div>
	)
}
