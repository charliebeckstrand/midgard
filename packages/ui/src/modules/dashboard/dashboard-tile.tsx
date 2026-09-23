'use client'

import { type ReactNode, Suspense, useCallback, useId, useRef } from 'react'
import { Card } from '../../components/card'
import { Placeholder } from '../../components/placeholder'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileContext, useDashboardActions } from './context'
import { DashboardHandle } from './dashboard-handle'
import { DashboardTileBoundary } from './dashboard-tile-boundary'
import { DashboardTileEdges } from './dashboard-tile-edges'
import { DashboardTileHeader } from './dashboard-tile-header'
import { gridArea } from './engine/dashboard-layout'
import { useDashboardFlip } from './use-dashboard-flip'
import { useDashboardStore } from './use-dashboard-store'
import { useDashboardTileCell } from './use-dashboard-tile-cell'
import { useDashboardTileDrag } from './use-dashboard-tile-drag'

/** The minimum content width of a tile, in px: about where a chart with a legend stays legible. */
const DEFAULT_MIN_WIDTH = 320

/** Props for {@link DashboardTile}. */
export type DashboardTileProps = {
	/** The stable id that joins the tile to its layout entry. */
	id: string
	/**
	 * The heading of the tile. It names the tile for assistive tech and in the
	 * live region. A widget inside a titled tile needs no title of its own.
	 */
	title?: string
	/** A muted line under the title: a unit, a period, or a caveat. */
	description?: ReactNode
	/** Controls at the far end of the header row, for example a menu or a badge. They stay live in edit mode. */
	actions?: ReactNode
	/**
	 * Fixes the `width / height` ratio of the tile, for example `16 / 9` for a chart.
	 * The saved layout then stores no height, because the height follows the width.
	 * Omit it for a free-form tile, which resizes on both axes.
	 */
	ratio?: number
	/**
	 * The narrowest content width in px at which the content stays legible. A
	 * resize never goes under it. When the container renders the tile narrower,
	 * the board re-packs so that the tile gets this width.
	 * @defaultValue 320
	 */
	minWidth?: number
	/** What the tile shows while its content suspends. Defaults to a placeholder block. */
	fallback?: ReactNode
	className?: string
	/** The widget. Keep the element stable, because a move never renders it again. */
	children?: ReactNode
}

/**
 * One tile of a dashboard: a card with a header row and a content box.
 *
 * The tile owns its chrome. It draws the title, the description, the actions,
 * and the drag grip, so a widget inside it needs no dashboard code. In edit mode
 * the tile sets `inert` on the content box. No widget then takes a pointer, a
 * focus, or an assistive-tech read while the user arranges the board.
 *
 * The tile renders again only when its own cell or its own flags change. A move
 * glides, and each change of size snaps. Each tile has its own error boundary and
 * its own Suspense boundary, so a widget that fails or waits affects only its tile.
 *
 * @remarks
 * A tile with a layout entry renders on the server at its saved cell. A tile
 * with no entry takes a new row under the lowest tile. It first renders on the
 * client, because the board must know each mounted tile to place it.
 * @example
 * ```tsx
 * <DashboardTile id="revenue" title="Revenue" ratio={16 / 9} actions={<Badge>Live</Badge>}>
 *   <BarChart aria-label="Revenue by month" aspectRatio={false} data={rows} series={series} />
 * </DashboardTile>
 * ```
 */
export function DashboardTile({
	id,
	title,
	description,
	actions,
	ratio,
	minWidth = DEFAULT_MIN_WIDTH,
	fallback,
	className,
	children,
}: DashboardTileProps) {
	const label = title ?? id

	const cell = useDashboardTileCell(id, { ratio, minWidth, label })

	const gap = useDashboardStore((_, state) => state.gap)

	const columns = useDashboardStore((_, state) => state.columns)

	const editable = useDashboardStore((view) => view.editable)

	const projected = useDashboardStore((view) => view.projected)

	const resizing = useDashboardStore(
		(_, state) => state.gesture?.kind === 'resize' && state.gesture.id === id,
	)

	const movable = editable && cell !== undefined && !cell.static

	const drag = useDashboardTileDrag(id, cell, movable)

	const shell = useRef<HTMLDivElement | null>(null)

	const { setNodeRef } = drag

	const setShell = useCallback(
		(element: HTMLDivElement | null) => {
			shell.current = element

			setNodeRef(element)
		},
		[setNodeRef],
	)

	useDashboardFlip(shell, { cell, carried: drag.carried, snap: projected })

	const { reportError } = useDashboardActions()

	const onError = useCallback((error: unknown) => reportError(id, error), [reportError, id])

	const titleId = useId()

	if (cell === undefined) return null

	const hasHeader = title !== undefined || description !== undefined || actions !== undefined

	const handle = movable && (
		<DashboardHandle {...drag.grip} label={`Move ${label}`} floating={!hasHeader} />
	)

	const carried = drag.carried

	return (
		<div
			ref={setShell}
			data-slot="dashboard-tile"
			data-dragging={dataAttr(drag.dragging)}
			data-static={dataAttr(cell.static)}
			style={{
				gridArea: gridArea(cell),
				padding: gap / 2,
				transform: carried ? `translate3d(${carried.x}px, ${carried.y}px, 0)` : undefined,
			}}
			className={cn(k.tile({ lifted: drag.dragging || resizing }), className)}
		>
			<Card
				size="sm"
				bg="surface"
				{...(title === undefined ? {} : { role: 'group', 'aria-labelledby': titleId })}
				className={cn(k.card({ editable, dragging: drag.dragging }))}
			>
				{hasHeader && (
					<DashboardTileHeader
						titleId={titleId}
						title={title}
						description={description}
						actions={actions}
						handle={handle}
					/>
				)}

				<div data-slot="dashboard-tile-content" inert={editable} className={cn(k.content)}>
					<DashboardTileContext value={id}>
						<DashboardTileBoundary label={label} onError={onError}>
							<Suspense fallback={fallback ?? <Placeholder className="size-full" />}>
								{children}
							</Suspense>
						</DashboardTileBoundary>
					</DashboardTileContext>
				</div>
			</Card>

			{!hasHeader && handle}

			{movable && (
				<DashboardTileEdges
					id={id}
					cell={cell}
					columns={columns}
					label={label}
					freeHeight={ratio === undefined}
					resizing={resizing}
				/>
			)}
		</div>
	)
}
