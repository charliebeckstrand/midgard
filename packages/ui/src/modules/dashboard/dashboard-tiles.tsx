'use client'

import { memo, type ReactNode, useMemo } from 'react'
import { Text } from '../../components/text'
import { cn } from '../../core'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardWidgets } from './context'
import { DashboardTile } from './dashboard-tile'
import { sortByOrder } from './engine/dashboard-layout'
import type { DashboardSpecTile } from './engine/dashboard-spec'
import type { DashboardWidget, DashboardWidgetRenderer } from './types'
import { useDashboardStore } from './use-dashboard-store'

/**
 * The line that a spec tile shows when no widget claims its kind. It names the
 * kind, because the name is the one fact that the user and the developer can
 * both act on.
 */
const statedFallback: DashboardWidgetRenderer = (tile) => (
	<div data-slot="dashboard-tile-missing" className={cn(k.missing)}>
		<Text tone="muted">This dashboard cannot show a “{tile.widget}” tile.</Text>
	</div>
)

/** Props for {@link DashboardTiles}. */
export type DashboardTilesProps = {
	/**
	 * The spec tiles. Each `id` must be unique on the board. The board renders
	 * them by their place, and this order places a tile that has no entry yet.
	 */
	tiles: readonly DashboardSpecTile[]
	/**
	 * The controls at the far end of the header row of each tile, for example a
	 * remove button. Hoist it or wrap it in `useCallback`: a fresh function renders
	 * each spec tile again.
	 */
	actions?: (tile: DashboardSpecTile) => ReactNode
	/**
	 * Removes a spec tile. When set, edit mode shows a remove control on each
	 * tile. Apply it with `removeSpecTile`. Hoist it or wrap it in `useCallback`.
	 */
	onRemove?: (tile: DashboardSpecTile) => void
	/**
	 * Duplicates a spec tile. When set, edit mode shows a duplicate control on
	 * each tile. Apply it with `duplicateSpecTile`. Hoist it or wrap it in `useCallback`.
	 */
	onDuplicate?: (tile: DashboardSpecTile) => void
	/**
	 * Show an expand control on each tile at rest.
	 * @defaultValue false
	 */
	expandable?: boolean
}

/**
 * Renders one `DashboardTile` for each spec tile, through the widget kinds of the
 * nearest `DashboardWidgetProvider`. Place it inside a `Dashboard`, beside any
 * JSX tiles.
 *
 * The kind gives the tile its `ratio`, its `minWidth`, its `defaultSize`, and its
 * `minSize` and `maxSize`. The spec tile gives the title and the description,
 * and its own `defaultSize` replaces the one of the kind. The provider `mount`
 * applies to each tile. A kind that no widget claims keeps its tile, and the
 * content box states the gap.
 * That tile demands no width, so it never re-packs the board.
 *
 * The tiles render in reading order, by row and then by column, and not in the
 * order of `tiles`. In edit mode the markup holds still, and the new order takes
 * effect when edit mode ends.
 *
 * Each spec tile renders through a memoized component. A spec tile that keeps its
 * object, under a registry that keeps its widget, does not render again when the
 * app commits a new layout.
 *
 * The renderer of a kind runs inside the error boundary of its tile. A renderer
 * that throws, for example on saved `options` of an old shape, fails only its own
 * tile, and `onTileError` receives it.
 *
 * @example
 * ```tsx
 * const remove = useCallback((tile) => setSpec((spec) => removeSpecTile(spec, tile.id)), [])
 *
 * <Dashboard aria-label="Sales" layout={{ value: spec.layout, onValueChange: setLayout }}>
 *   <DashboardTiles tiles={spec.tiles} onRemove={remove} expandable />
 * </Dashboard>
 * ```
 */
export function DashboardTiles({
	tiles,
	actions,
	onRemove,
	onDuplicate,
	expandable = false,
}: DashboardTilesProps) {
	const { widgets, fallback = statedFallback, mount = 'always' } = useDashboardWidgets()

	const order = useDashboardStore((view) => view.order)

	// The markup follows the board, so the keyboard and assistive tech meet the
	// tiles as the eye reads them. A tile with no entry yet goes last, in spec order.
	const ordered = useMemo(() => sortByOrder(tiles, order, (tile) => tile.id), [tiles, order])

	return (
		<>
			{ordered.map((tile) => (
				<DashboardSpecTileView
					key={tile.id}
					tile={tile}
					// An own key only. A name from storage such as "constructor" is then no
					// widget, and not a member of the object prototype.
					widget={Object.hasOwn(widgets, tile.widget) ? widgets[tile.widget] : undefined}
					fallback={fallback}
					mount={mount}
					actions={actions}
					onRemove={onRemove}
					onDuplicate={onDuplicate}
					expandable={expandable}
				/>
			))}
		</>
	)
}

/** Props for {@link DashboardSpecTileBody}. @internal */
type DashboardSpecTileBodyProps = {
	/** Draws the widget of the spec tile. */
	render: DashboardWidgetRenderer
	/** The spec tile. */
	tile: DashboardSpecTile
}

/**
 * The widget of one spec tile. The renderer runs here, inside the error boundary
 * and the Suspense boundary of its tile. A renderer that throws, for example on
 * saved `options` of an old shape, then fails only its own tile.
 *
 * @internal
 */
function DashboardSpecTileBody({ render, tile }: DashboardSpecTileBodyProps) {
	return render(tile)
}

/** Props for {@link DashboardSpecTileView}. @internal */
type DashboardSpecTileViewProps = {
	/** The spec tile. */
	tile: DashboardSpecTile
	/** The widget of its kind, or `undefined` when no widget claims it. */
	widget: DashboardWidget | undefined
	/** Draws a tile whose kind no widget claims. */
	fallback: DashboardWidgetRenderer
	/** The mount policy of the content. */
	mount: Mount
	/** The header controls of the tile. */
	actions?: (tile: DashboardSpecTile) => ReactNode
	/** Removes a spec tile. */
	onRemove?: (tile: DashboardSpecTile) => void
	/** Duplicates a spec tile. */
	onDuplicate?: (tile: DashboardSpecTile) => void
	/** Whether the tile shows an expand control at rest. */
	expandable: boolean
}

/**
 * One spec tile as a `DashboardTile`. It renders again only when one of its
 * props changes by identity.
 *
 * @internal
 */
const DashboardSpecTileView = memo(function DashboardSpecTileView({
	tile,
	widget,
	fallback,
	mount,
	actions,
	onRemove,
	onDuplicate,
	expandable,
}: DashboardSpecTileViewProps) {
	const render = widget?.render ?? fallback

	return (
		<DashboardTile
			id={tile.id}
			title={tile.title}
			description={tile.description}
			actions={actions?.(tile)}
			ratio={widget?.ratio}
			// A tile with no widget shows a line of text. It demands no width, so a
			// narrow saved span never re-packs the board or stops edit mode.
			minWidth={widget === undefined ? 0 : widget.minWidth}
			defaultSize={tile.defaultSize ?? widget?.defaultSize}
			minSize={widget?.minSize}
			maxSize={widget?.maxSize}
			mount={mount}
			onRemove={onRemove && (() => onRemove(tile))}
			onDuplicate={onDuplicate && (() => onDuplicate(tile))}
			expandable={expandable}
		>
			<DashboardSpecTileBody render={render} tile={tile} />
		</DashboardTile>
	)
})
