'use client'

import type { ChartContextMenuConfig } from './chart-context-menu'
import { useChartFullscreen } from './context'

/**
 * Whether `ChartContextMenu` renders a menu for `contextMenu`. It does
 * not for `false`. It does not inside the fullscreen dialog either: a chart
 * there is the re-mounted copy of the menu, which renders bare, so the
 * enlarged chart never nests a second menu or recurses. The rule lives here
 * beside the menu that provides `ChartFullscreenContext`, so a host that
 * reports a menu target (the choropleth) reads the same answer.
 *
 * @internal
 */
export function useChartMenuShown(
	contextMenu: ChartContextMenuConfig | false | undefined,
): boolean {
	const isFullscreen = useChartFullscreen()

	return contextMenu !== false && !isFullscreen
}
