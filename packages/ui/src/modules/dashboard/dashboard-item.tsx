'use client'

import { useDraggable } from '@dnd-kit/core'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn, dataAttr } from '../../core'
import { useComposedRef } from '../../hooks'
import { DragHandleContext, type DragHandleContextValue } from '../../primitives/drag-handle'
import { k } from '../../recipes/kata/dashboard'
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
const DEFAULT_MIN_WIDTH = 240

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
	 * The narrowest the content stays legible, in px. It clamps how far the
	 * tile resizes down, and drives the content-based stacking: in a container
	 * too narrow to honour it side by side, the tile widens and its former
	 * neighbours wrap below — each tile inducing its own private breakpoint,
	 * with no global one anywhere.
	 * @defaultValue 240
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
 * registers its content demands (`ratio`, `minWidth`) with the grid, paints
 * at its cell through pure percentage geometry (SSR-correct at any width),
 * and glides between cells on the shared spring — a FLIP on its transform,
 * skipped under reduced motion. In editing mode it mints the drag grip and
 * broadcasts it through the ambient `DragHandleContext`: a chart header
 * inside adopts and claims it, and while nothing claims, the same grip
 * floats on the tile's corner. Its east edge (south too, free-form) carries
 * a splitter; while the tile is dragged its content rides the drag overlay
 * and the shell stays behind as the snapped, gliding placeholder.
 *
 * @remarks Keep `children` referentially stable (hoist or memoize heavy
 * content): the shell re-renders on every preview beat of a gesture, and a
 * stable element lets React bail out of the content subtree.
 */
export function DashboardItem({
	id,
	ratio,
	minWidth = DEFAULT_MIN_WIDTH,
	children,
}: DashboardItemProps) {
	const {
		editing,
		columns,
		gap,
		maxRow,
		cells,
		columnPitch,
		register,
		activeId,
		resizingId,
		overlay,
	} = useDashboard()

	useLayoutEffect(() => register(id, { ratio, minWidth }), [register, id, ratio, minWidth])

	const cell = cells.get(id)

	const interactive = editing && cell !== undefined && !cell.static

	const {
		attributes,
		listeners,
		setNodeRef: setDraggableRef,
		setActivatorNodeRef,
	} = useDraggable({ id, disabled: !interactive })

	const elementRef = useRef<HTMLDivElement | null>(null)

	const shellRef = useComposedRef(setDraggableRef, elementRef)

	// The tile's content, mirrored for the drag overlay: the overlay renders
	// this exact node while the shell stays behind as the placeholder.
	overlay.current.set(id, children)

	useEffect(() => {
		return () => {
			overlay.current.delete(id)
		}
	}, [overlay, id])

	// FLIP glide: a cell change jumps the transform by the old-minus-new pixel
	// delta, then springs it back to zero — the tile appears to slide from
	// where it was. Interruptions accumulate into the same motion values, so a
	// reflow mid-flight redirects instead of snapping. The tile driving a
	// gesture is exempt: its placeholder snaps to each simulated cell at once,
	// so the drop target reads crisp under the pointer while only the
	// displaced neighbours glide.
	const dx = useMotionValue(0)

	const dy = useMotionValue(0)

	const reducedMotion = useReducedMotion()

	const gesturing = activeId === id || resizingId === id

	const previousRef = useRef<{ x: number; y: number } | null>(null)

	const x = cell?.x

	const y = cell?.y

	useLayoutEffect(() => {
		if (x === undefined || y === undefined) return

		const previous = previousRef.current

		previousRef.current = { x, y }

		if (previous === null || columnPitch <= 0 || reducedMotion || gesturing) return

		const deltaX = (previous.x - x) * columnPitch

		const deltaY = ((previous.y - y) * columnPitch) / ROW_SUBDIVISION

		if (deltaX === 0 && deltaY === 0) return

		dx.set(dx.get() + deltaX)

		dy.set(dy.get() + deltaY)

		// Motion renders value writes on its next animation frame — one frame
		// after this effect, which would let the browser paint the tile already
		// at its destination before the compensating transform lands: a visible
		// jump. Writing the transform here, pre-paint, closes that frame; the
		// spring then takes over from the same numbers.
		if (elementRef.current) {
			elementRef.current.style.transform = `translate3d(${dx.get()}px, ${dy.get()}px, 0)`
		}

		const settleX = animate(dx, 0, k.motion.flip)

		const settleY = animate(dy, 0, k.motion.flip)

		return () => {
			settleX.stop()

			settleY.stop()
		}
	}, [x, y, columnPitch, reducedMotion, gesturing, dx, dy])

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

	const dragging = activeId === id

	const resizing = resizingId === id

	return (
		<motion.div
			ref={shellRef}
			data-slot="dashboard-item"
			data-dragging={dataAttr(dragging)}
			data-static={dataAttr(cell.static)}
			className={cn(k.item({ dragging, lifted: resizing }))}
			style={{
				left: pct(cell.x / columns),
				top: pct(cell.y / maxRow),
				width: pct(cell.w / columns),
				height: pct(cell.h / maxRow),
				padding: gap / 2,
				x: dx,
				y: dy,
			}}
		>
			{dragging && (
				<div
					data-slot="dashboard-placeholder"
					className={cn(k.placeholder)}
					style={{ margin: gap / 2 }}
				/>
			)}

			<div
				data-slot="dashboard-item-content"
				className={cn(k.content({ editing }))}
				style={dragging ? { visibility: 'hidden' } : undefined}
			>
				<DragHandleContext value={handleValue}>{children}</DragHandleContext>

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
			</div>
		</motion.div>
	)
}
