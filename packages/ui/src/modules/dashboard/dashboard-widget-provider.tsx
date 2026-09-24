'use client'

import { type ReactNode, useMemo } from 'react'
import { DashboardWidgetContext, useDashboardWidgets } from './context'
import type { DashboardWidgetRegistry } from './types'

/** Props for {@link DashboardWidgetProvider}. */
export type DashboardWidgetProviderProps = DashboardWidgetRegistry & {
	children: ReactNode
}

/**
 * Registers the widget kinds that the spec tiles below it draw, by name.
 *
 * @remarks
 * This is the seam that keeps a chart, a grid, and a map out of the dashboard.
 * The module imports none of them. A spec tile names a kind, and the app that
 * wants the kind registers it here. `DashboardTiles` then renders each spec
 * tile through its kind.
 *
 * A name that no widget claims keeps its tile, and the content box states the
 * gap. The `fallback` here replaces that line. A saved board that outlives a
 * kind therefore still renders, and the user can remove the tile.
 *
 * Nesting merges rather than replaces. An inner provider adds its widgets to the
 * widgets of an outer provider, and wins on a name that they share. Its
 * `fallback` and its `mount` stand in only where it sets them.
 *
 * Hoist `widgets` out of the render, as a module constant or a `useMemo`. A fresh
 * object in each render is a fresh registry, and each spec tile renders again.
 *
 * @example
 * ```tsx
 * const widgets = {
 *   revenue: { render: (tile) => <Revenue {...(tile.options as RevenueOptions)} />, ratio: 16 / 9 },
 * }
 *
 * <DashboardWidgetProvider widgets={widgets}>
 *   <Dashboard aria-label="Sales" layout={{ value: spec.layout, onValueChange: setLayout }}>
 *     <DashboardTiles tiles={spec.tiles} />
 *   </Dashboard>
 * </DashboardWidgetProvider>
 * ```
 */
export function DashboardWidgetProvider({
	widgets,
	fallback,
	mount,
	children,
}: DashboardWidgetProviderProps) {
	const outer = useDashboardWidgets()

	const value = useMemo<DashboardWidgetRegistry>(
		() => ({
			widgets: { ...outer.widgets, ...widgets },
			fallback: fallback ?? outer.fallback,
			mount: mount ?? outer.mount,
		}),
		[outer, widgets, fallback, mount],
	)

	return <DashboardWidgetContext value={value}>{children}</DashboardWidgetContext>
}
