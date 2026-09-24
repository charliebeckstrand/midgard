'use client'

import { memo, type ReactNode } from 'react'
import { Text } from '../../components/text'
import { cn } from '../../core'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardWidgets } from './context'
import { DashboardTile } from './dashboard-tile'
import type { DashboardSpecTile } from './engine/dashboard-spec'
import type { DashboardWidget, DashboardWidgetRenderer } from './types'

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
	/** The spec tiles, in reading order. Each `id` must be unique on the board. */
	tiles: readonly DashboardSpecTile[]
	/**
	 * The controls at the far end of the header row of each tile, for example a
	 * remove button. Hoist it or wrap it in `useCallback`: a fresh function renders
	 * each spec tile again.
	 */
	actions?: (tile: DashboardSpecTile) => ReactNode
}

/**
 * Renders one `DashboardTile` for each spec tile, through the widget kinds of the
 * nearest `DashboardWidgetProvider`. Place it inside a `Dashboard`, beside any
 * JSX tiles.
 *
 * The kind gives the tile its `ratio`, its `minWidth`, and its `defaultSize`. The
 * spec tile gives the title and the description, and its own `defaultSize`
 * replaces the one of the kind. The provider `mount` applies to each tile. A
 * kind that no widget claims keeps its tile, and the content box states the gap.
 * That tile demands no width, so it never re-packs the board.
 *
 * Each spec tile renders through a memoized component. A spec tile that keeps its
 * object, under a registry that keeps its widget, does not render again when the
 * app commits a new layout.
 *
 * @example
 * ```tsx
 * <Dashboard aria-label="Sales" layout={{ value: spec.layout, onValueChange: setLayout }}>
 *   <DashboardTiles tiles={spec.tiles} actions={removeAction} />
 * </Dashboard>
 * ```
 */
export function DashboardTiles({ tiles, actions }: DashboardTilesProps) {
	const { widgets, fallback = statedFallback, mount = 'always' } = useDashboardWidgets()

	return (
		<>
			{tiles.map((tile) => (
				<DashboardSpecTileView
					key={tile.id}
					tile={tile}
					// An own key only. A name from storage such as "constructor" is then no
					// widget, and not a member of the object prototype.
					widget={Object.hasOwn(widgets, tile.widget) ? widgets[tile.widget] : undefined}
					fallback={fallback}
					mount={mount}
					actions={actions}
				/>
			))}
		</>
	)
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
			mount={mount}
		>
			{render(tile)}
		</DashboardTile>
	)
})
