export { Dashboard, type DashboardProps } from './dashboard'
export { DashboardTile, type DashboardTileProps } from './dashboard-tile'
export { DashboardTiles, type DashboardTilesProps } from './dashboard-tiles'
export {
	DashboardWidgetProvider,
	type DashboardWidgetProviderProps,
} from './dashboard-widget-provider'
export type { DashboardLayoutItem, DashboardTileSize } from './engine/dashboard-layout'
export type { DashboardSelection, DashboardSelectOptions } from './engine/dashboard-scope'
export {
	addSpecTile,
	type DashboardSpec,
	type DashboardSpecTile,
	duplicateSpecTile,
	nextSpecTileId,
	removeSpecTile,
} from './engine/dashboard-spec'
export {
	type DashboardSpecIssue,
	type DashboardSpecIssueKind,
	type DashboardSpecParse,
	parseDashboardSpec,
} from './engine/dashboard-spec-parse'
export type {
	DashboardFilterBinding,
	DashboardGestureEndEvent,
	DashboardGestureStartEvent,
	DashboardHandle,
	DashboardLayoutBinding,
	DashboardSelectionBinding,
	DashboardWidget,
	DashboardWidgetRegistry,
	DashboardWidgetRenderer,
} from './types'
export { useDashboardRows } from './use-dashboard-rows'
export { type DashboardScope, useDashboardScope } from './use-dashboard-scope'
