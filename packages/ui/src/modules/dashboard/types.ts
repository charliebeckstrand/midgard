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
	/**
	 * The controlled value. `undefined` leaves the dashboard uncontrolled, and
	 * `null` keeps it controlled with no value.
	 */
	value?: T | null
	/** The initial value when uncontrolled. */
	defaultValue?: T
	/** Receives each committed change. */
	onValueChange?: (value: T) => void
}

/**
 * The binding of the saved layout. It fires once for each committed change: a
 * drop, the end of a resize, or a tidy that moves a tile. A tile with a fixed
 * `ratio` emits no `h`.
 */
export type DashboardLayoutBinding = DashboardBinding<DashboardLayoutItem[]>

/**
 * The binding of the filter that the app owns. Edit it with `QueryBuilder`, and
 * each tile reads it through `useDashboardScope` or `useDashboardRows`.
 *
 * @remarks
 * Bind an optional filter as `value: spec.filter ?? null`. An `undefined` value
 * lets the board hold the filter itself. A filter that a tile set then stays
 * when the app clears its own filter.
 */
export type DashboardFilterBinding = DashboardBinding<QueryGroup>

/**
 * The binding of the cross-filter selections that the tiles make. The board
 * reads a value as given, so read a saved value through `parseDashboardSelection`.
 */
export type DashboardSelectionBinding = DashboardBinding<DashboardSelection[]>

/**
 * The commands that an app sends to a `Dashboard` through its `ref`, for example
 * from a toolbar next to the edit switch.
 */
export type DashboardHandle = {
	/**
	 * Packs the tiles upward, and commits the result through the layout binding.
	 * Each tile keeps its column and its span. It moves straight up until it meets
	 * a tile or the top edge, so each column keeps its order. A static tile never
	 * moves. The live region says how many tiles moved.
	 *
	 * @remarks
	 * The board never packs itself, so this is the one bulk move. It packs the
	 * saved layout, also in a projection and outside edit mode. A tile that is not
	 * mounted keeps its saved place. During a drag or a resize it does nothing.
	 *
	 * @returns Whether a tile moved.
	 */
	tidy: () => boolean
}

/** The payload when a drag or a resize starts. */
export type DashboardGestureStartEvent = {
	/** The id of the tile that the gesture moves. */
	id: string
	/**
	 * The saved layout at the start. A cancel commits nothing, so a change from
	 * outside during the gesture stays.
	 */
	layout: readonly DashboardLayoutItem[]
}

/**
 * The payload when a drag or a resize ends. A cancel and a gesture that changes
 * nothing both set `canceled`, so each start has exactly one end.
 *
 * @remarks
 * When the layout changes from outside during a gesture, the gesture ends as
 * canceled and commits nothing. The outside change stays on the board.
 *
 * When the `onValueChange` of the layout throws, the gesture still ends once,
 * and the board then throws the error again. An uncontrolled board keeps the new
 * layout. A controlled board keeps its `value`, so the end is canceled.
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
 * @remarks
 * The renderer runs inside the error boundary and the Suspense boundary of its
 * tile. It runs again on each Suspense retry and on each Retry of the tile, so it
 * returns an element and never a promise. A widget that waits suspends inside
 * the component that the renderer returns, for example through `lazy` or `use` of
 * a cached promise.
 *
 * @example
 * ```tsx
 * const render: DashboardWidgetRenderer = (tile) => <Revenue {...(tile.options as RevenueOptions)} />
 * ```
 */
export type DashboardWidgetRenderer = (
	tile: DashboardSpecTile,
) => Exclude<ReactNode, Promise<unknown>>

/** One widget kind: the renderer, and the demands that its tiles make of their cells. */
export type DashboardWidget = {
	/** Draws the content of each tile of this kind. */
	render: DashboardWidgetRenderer
	/**
	 * The fixed `width / height` ratio of each tile of this kind. Omit it for a
	 * free-form tile. A value that is not a finite number above 0 counts as no ratio.
	 */
	ratio?: number
	/**
	 * The narrowest content width in px at which the content stays legible. A value
	 * that is not a finite number of 0 or more puts no floor on the width.
	 */
	minWidth?: number
	/**
	 * The span of a new tile of this kind, before the layout holds an entry for
	 * it. A stat can then take a small span, and a grid the full width.
	 */
	defaultSize?: DashboardTileSize
	/** The smallest span of each tile of this kind in grid units. See the `minSize` prop of `DashboardTile`. */
	minSize?: Partial<DashboardTileSize>
	/** The largest span of each tile of this kind in grid units. See the `maxSize` prop of `DashboardTile`. */
	maxSize?: Partial<DashboardTileSize>
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
