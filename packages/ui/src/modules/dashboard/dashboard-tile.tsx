'use client'

import { type ReactNode, useCallback, useId, useMemo } from 'react'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardActions } from './context'
import { DashboardTileCard } from './dashboard-tile-card'
import { DashboardTileEdges } from './dashboard-tile-edges'
import { type DashboardTileSize, gridArea } from './engine/dashboard-layout'
import type { DashboardState, DashboardView } from './engine/dashboard-store'
import { useDashboardFlip } from './use-dashboard-flip'
import { useDashboardStore } from './use-dashboard-store'
import { useDashboardTileCell } from './use-dashboard-tile-cell'
import { useDashboardTileDrag } from './use-dashboard-tile-drag'

/** The minimum content width of a tile, in px: about where a chart with a legend stays legible. */
const DEFAULT_MIN_WIDTH = 320

/** Whether the gestures of the board are live. */
const selectEditable = (view: DashboardView) => view.editable

/** Whether the board paints the responsive re-pack. */
const selectProjected = (view: DashboardView) => view.projected

/**
 * Whether a tile draws a header row. A tile with standard controls always has
 * one, so its content box keeps its height when the controls swap on the switch
 * of edit mode.
 */
function hasHeaderRow(props: DashboardTileProps): boolean {
	const { title, description, actions, onRemove, onDuplicate, expandable } = props

	return (
		[title, description, actions, onRemove, onDuplicate].some((part) => part !== undefined) ||
		expandable === true
	)
}

/** Props for {@link DashboardTile}. */
export type DashboardTileProps = {
	/**
	 * The stable id that joins the tile to its layout entry. It must be unique on
	 * the board, spec tiles included. In development, a repeated id logs an error.
	 */
	id: string
	/**
	 * The heading of the tile. It names the tile for assistive tech and in the
	 * live region. A widget inside a titled tile needs no title of its own.
	 */
	title?: string
	/**
	 * A muted line under the title: a unit, a period, or a caveat.
	 *
	 * @remarks
	 * The description has its own error boundary and Suspense boundary, in the
	 * header row and in the expand dialog. When it throws, it goes away, and
	 * `onTileError` receives the error. A new element does not bring it back. A
	 * render with no `description`, or a new mount of the tile, does. The expand
	 * dialog tries it again each time it opens. While it suspends, it shows nothing.
	 */
	description?: ReactNode
	/**
	 * Controls at the far end of the header row, for example a menu or a badge. They
	 * stay live in edit mode, and a press on them or in their portal starts no drag.
	 *
	 * @remarks
	 * The controls have their own error boundary and Suspense boundary. When they
	 * throw, they go away, and `onTileError` receives the error. A new element does
	 * not bring them back. A render with no `actions`, or a new mount of the tile,
	 * does. While they suspend, they show nothing.
	 */
	actions?: ReactNode
	/**
	 * Fixes the `width / height` ratio of the tile, for example `16 / 9` for a chart.
	 * The saved layout then stores no height, because the height follows the width.
	 * Omit it for a free-form tile, which resizes on both axes. A value that is not
	 * a finite number above 0, such as the 0/0 of an image before it loads, counts
	 * as no ratio.
	 */
	ratio?: number
	/**
	 * The narrowest content width in px at which the content stays legible. A
	 * resize never goes under it. When the container renders the tile narrower,
	 * the board re-packs so that the tile gets this width. A value that is not a
	 * finite number of 0 or more puts no floor on the width. It does not take the default.
	 * @defaultValue 320
	 */
	minWidth?: number
	/**
	 * The span of the tile in grid units when the layout holds no entry for it.
	 * The tile takes a new row under the lowest tile at this span, and the first
	 * commit writes its entry. `h` counts only for a free-form tile.
	 * @defaultValue `{ w: 8, h: 18 }`
	 */
	defaultSize?: DashboardTileSize
	/**
	 * The smallest span of the tile in grid units. A resize never goes under it,
	 * and a new tile takes at least this span. Each axis is optional. A tile with
	 * a fixed `ratio` ignores `h`, because its width sets its height.
	 *
	 * @remarks
	 * The saved layout renders as saved, so an entry under the limit keeps its
	 * span until a resize. The width floor is the larger of `minSize.w` and the
	 * span that `minWidth` needs. The re-pack of a narrow container ignores the
	 * limits, because it fills each shelf.
	 */
	minSize?: Partial<DashboardTileSize>
	/**
	 * The largest span of the tile in grid units. A resize never goes over it, and
	 * a new tile takes at most this span. Each axis is optional. A tile with a
	 * fixed `ratio` ignores `h`. When a minimum is larger than its maximum, the
	 * minimum wins.
	 */
	maxSize?: Partial<DashboardTileSize>
	/**
	 * When the content mounts, relative to the viewport. `lazy` holds the content
	 * back until the tile comes near the viewport, and then keeps it. `active` also
	 * unmounts it when the tile leaves. A held tile shows its `fallback`, and its
	 * cell keeps the space.
	 *
	 * @remarks
	 * Under `lazy` and `active`, the server renders the fallback. The content
	 * mounts on the client after hydration.
	 * @defaultValue 'always'
	 */
	mount?: Mount
	/** What the tile shows while its content suspends or is held back. Defaults to a placeholder block. */
	fallback?: ReactNode
	/**
	 * Removes the tile. When set, edit mode shows a remove control in the header
	 * row. The app owns the tile list, so it does the remove: for a spec tile,
	 * with `removeSpecTile`. For a JSX tile, also drop its entry from the saved
	 * layout. Else a later tile with that id takes its stale place. The focus moves
	 * to the grip of a neighbor tile.
	 */
	onRemove?: () => void
	/**
	 * Duplicates the tile. When set, edit mode shows a duplicate control in the
	 * header row. For a spec tile, do the copy with `duplicateSpecTile`.
	 */
	onDuplicate?: () => void
	/**
	 * Show an expand control at rest. It opens the content in a dialog, at a
	 * larger size, in the scope of the same tile. When edit mode starts, an open
	 * dialog closes. The focus then moves to the grip of the tile. A tile with no
	 * grip, such as a tile with a `static` layout entry, gives the focus to the board.
	 * @defaultValue false
	 */
	expandable?: boolean
	className?: string
	/**
	 * The widget. Keep the element stable, because a move never renders it again.
	 *
	 * @remarks
	 * When the widget throws, the tile shows an error state with a retry button, and
	 * `onTileError` receives the error. The error state stays until a press on the
	 * retry button, also when a new element comes. A widget that throws again on
	 * each render of the app therefore cannot loop. In edit mode the content is
	 * inert, so the retry button works only at rest.
	 */
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
 * The content box is an inline-size container. A container query or a `cqi`
 * unit in a widget therefore reads the tile, and not the board.
 *
 * While the tile drags, the whole page shows the grabbing cursor. The hand thus
 * stays closed when the carried tile stops at an edge and the pointer goes on.
 *
 * The tile renders again only when its own cell or its own flags change. A move
 * glides, and each change of size snaps. Each tile has its own error boundary and
 * its own Suspense boundary, so a widget that fails or waits affects only its tile.
 * The description and the actions each have a pair of their own.
 *
 * @remarks
 * A tile with a layout entry renders on the server at its saved cell. A tile
 * with no entry takes a new row under the lowest tile, at its `defaultSize` and
 * in markup order. It first renders on the client, because the board must know
 * each mounted tile to place it.
 *
 * A chart at the spark tier writes `data-tier="spark"`, and the card reads it
 * through CSS. The header then becomes a veil over the top of the content, so the
 * sparkline takes the full height. A spark chart anywhere in the content box
 * veils the header, and a spark chart in the actions does not. At rest the veil
 * shows on hover or focus, and in edit mode it stays in view for the grip. Where
 * the primary pointer cannot hover, as on a phone or a tablet, the veil stays in
 * view at rest too.
 *
 * At rest, a truncated title shows its full text in a tooltip on hover. The veil
 * is narrow, so the title of a spark tile truncates first.
 * @example
 * ```tsx
 * <DashboardTile id="revenue" title="Revenue" ratio={16 / 9} actions={<Badge>Live</Badge>}>
 *   <BarChart aria-label="Revenue by month" aspectRatio={false} data={rows} series={series} />
 * </DashboardTile>
 * ```
 */
export function DashboardTile(props: DashboardTileProps) {
	const {
		id,
		title,
		description,
		actions,
		ratio,
		minWidth = DEFAULT_MIN_WIDTH,
		defaultSize,
		minSize,
		maxSize,
		mount = 'always',
		fallback,
		onRemove,
		onDuplicate,
		expandable = false,
		className,
		children,
	} = props

	const label = title ?? id

	const cell = useDashboardTileCell(id, { ratio, minWidth, label, defaultSize, minSize, maxSize })

	const editable = useDashboardStore(selectEditable)

	const projected = useDashboardStore(selectProjected)

	const resizing = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) =>
				state.gesture?.kind === 'resize' && state.gesture.id === id,
			[id],
		),
	)

	const movable = editable && cell !== undefined && !cell.static

	const drag = useDashboardTileDrag(id, cell, movable)

	const { node, setNodeRef } = drag

	useDashboardFlip(node, { cell, carried: drag.carried, snap: projected })

	const { reportError } = useDashboardActions()

	const onError = useCallback((error: unknown) => reportError(id, error), [reportError, id])

	const titleId = useId()

	// Held, so a fresh placeholder element never renders the memoized card again.
	const placeholder = useMemo(() => fallback ?? <Placeholder className="size-full" />, [fallback])

	if (cell === undefined) return null

	const carried = drag.carried

	return (
		<div
			ref={setNodeRef}
			data-slot="dashboard-tile"
			style={{
				gridArea: gridArea(cell),
				// The canvas publishes the gutter, and the tile insets half of it on each side.
				padding: 'calc(var(--dashboard-gap) / 2)',
				transform: carried ? `translate3d(${carried.x}px, ${carried.y}px, 0)` : undefined,
			}}
			className={cn(k.tile({ lifted: drag.dragging || resizing }), className)}
		>
			<DashboardTileCard
				id={id}
				label={label}
				titleId={titleId}
				title={title}
				description={description}
				actions={actions}
				hasHeader={hasHeaderRow(props)}
				editable={editable}
				movable={movable}
				dragging={drag.dragging}
				grip={drag.grip}
				surface={drag.surface}
				mount={mount}
				fallback={placeholder}
				onError={onError}
				onRemove={onRemove}
				onDuplicate={onDuplicate}
				expandable={expandable}
				shell={node}
			>
				{children}
			</DashboardTileCard>

			{movable && (
				<DashboardTileEdges
					id={id}
					cell={cell}
					label={label}
					freeHeight={ratio === undefined}
					resizing={resizing}
				/>
			)}
		</div>
	)
}
