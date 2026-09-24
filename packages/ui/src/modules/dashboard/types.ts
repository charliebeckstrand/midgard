import type { ReactNode } from 'react'
import type { Mount } from '../../primitives/mount'
import type { QueryGroup } from '../query/engine/types'
import type { DashboardLayoutItem, DashboardTileSize } from './engine/dashboard-layout'
import type { DashboardSelection } from './engine/dashboard-scope'
import type { DashboardSpecTile } from './engine/dashboard-spec'

/**
 * A value that the app can control, on the house `value` / `defaultValue` /
 * `onValueChange` triad. Omit `value` to let the dashboard hold the state.
 */
type DashboardBinding<T> = {
	/** The controlled value. `undefined` leaves the dashboard uncontrolled. */
	value?: T
	/** The initial value when uncontrolled. */
	defaultValue?: T
	/** Receives each committed change. */
	onValueChange?: (value: T) => void
}

/**
 * The binding of the saved layout. It fires once for each committed gesture: a
 * drop or the end of a resize. A tile with a fixed `ratio` emits no `h`.
 */
export type DashboardLayoutBinding = DashboardBinding<DashboardLayoutItem[]>

/**
 * The binding of the filter that the app owns. Edit it with `QueryBuilder`, and
 * each tile reads it through `useDashboardScope` or `useDashboardRows`.
 */
export type DashboardFilterBinding = DashboardBinding<QueryGroup>

/** The binding of the cross-filter selections that the tiles make. */
export type DashboardSelectionBinding = DashboardBinding<DashboardSelection[]>

/** The payload when a drag or a resize starts. */
export type DashboardGestureStartEvent = {
	/** The id of the tile that the gesture moves. */
	id: string
	/** The saved layout at the start. A cancel returns to it. */
	layout: readonly DashboardLayoutItem[]
}

/**
 * The payload when a drag or a resize ends. A cancel and a gesture that changes
 * nothing both set `canceled`, so each start has exactly one end.
 */
export type DashboardGestureEndEvent = {
	/** The id of the tile that the gesture moved. */
	id: string
	/** Whether the gesture ended with no change. */
	canceled: boolean
	/** The saved layout after the gesture. */
	layout: readonly DashboardLayoutItem[]
}

/**
 * Draws the content of one spec tile. The tile reaches the renderer whole, so
 * a renderer reads `options` as its own shape.
 *
 * `options` arrives as `unknown`, because the dashboard cannot know what the app
 * saved. The cast belongs here, at the registration, where the kind and the
 * options are agreed. Return an element: its component reads the scope with
 * `useDashboardScope` or `useDashboardRows`, as in a JSX tile.
 *
 * @example
 * ```tsx
 * const render: DashboardWidgetRenderer = (tile) => <Revenue {...(tile.options as RevenueOptions)} />
 * ```
 */
export type DashboardWidgetRenderer = (tile: DashboardSpecTile) => ReactNode

/** One widget kind: the renderer, and the demands that its tiles make of their cells. */
export type DashboardWidget = {
	/** Draws the content of each tile of this kind. */
	render: DashboardWidgetRenderer
	/** The fixed `width / height` ratio of each tile of this kind. Omit it for a free-form tile. */
	ratio?: number
	/** The narrowest content width in px at which the content stays legible. */
	minWidth?: number
	/**
	 * The span of a new tile of this kind, before the layout holds an entry for
	 * it. A stat can then take a small span, and a grid the full width.
	 */
	defaultSize?: DashboardTileSize
}

/**
 * The widget kinds that a board can draw, by name, and the fallback for a name
 * that no widget claims.
 */
export type DashboardWidgetRegistry = {
	/** The widget kinds by name. A name absent here falls to {@link DashboardWidgetRegistry.fallback}. */
	widgets: Readonly<Record<string, DashboardWidget>>
	/**
	 * Draws the content of a spec tile whose kind no widget claims. The tile keeps
	 * its cell and its chrome. Absent draws the stated line of the module.
	 */
	fallback?: DashboardWidgetRenderer
	/**
	 * When the content of each spec tile mounts, relative to the viewport. See the
	 * `mount` prop of `DashboardTile`.
	 * @defaultValue 'always'
	 */
	mount?: Mount
}
