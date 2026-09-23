import type { QueryGroup } from '../query/engine/types'
import type { DashboardLayoutItem } from './engine/dashboard-layout'
import type { DashboardSelection } from './engine/dashboard-scope'

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
