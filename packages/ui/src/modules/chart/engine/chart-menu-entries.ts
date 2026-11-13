import { resolveContextMenuEntries } from '../../../components/context-menu/context-menu-merge'
import type { ContextMenuEntry, ContextMenuItem } from '../../../components/context-menu/types'
import type { ChartContextMenuConfig } from './chart-context-menu'

/** The key of a default item of the chart menu. @internal */
export type ChartMenuDefaultKey =
	| 'fullscreen'
	| 'view-data'
	| 'copy-data'
	| 'download-png'
	| 'download-jpg'
	| 'download-csv'

/**
 * The keys of the default items of the chart menu, in menu order. The chart
 * menu builds its default items from this list. `ChartHeaderActionsFallback`
 * reads the same list, so it draws the buttons of the menu that the chart has.
 *
 * @param fullscreen - The chart has a copy for the fullscreen dialog.
 * @param readout - The chart has a readout: values to show, to copy, and to
 * download as CSV.
 *
 * @internal
 */
export function chartMenuDefaultKeys(fullscreen: boolean, readout: boolean): ChartMenuDefaultKey[] {
	return [
		...(fullscreen ? (['fullscreen'] as const) : []),
		...(readout ? (['view-data', 'copy-data'] as const) : []),
		'download-png',
		'download-jpg',
		...(readout ? (['download-csv'] as const) : []),
	]
}

/**
 * The entries of the chart menu that the menu button and the header row show:
 * the custom items of `config` merged with `defaults`. A press of the menu
 * button lands on no mark, so a function-form `items` gets `index: null`.
 *
 * @internal
 */
export function chartMenuEntries(
	config: Pick<ChartContextMenuConfig, 'items' | 'defaultItems' | 'insert'> | undefined,
	defaults: ContextMenuEntry[],
): ContextMenuEntry[] {
	const items = config?.items

	return resolveContextMenuEntries(
		{
			items: typeof items === 'function' ? items({ index: null }) : items,
			defaultItems: config?.defaultItems,
			insert: config?.insert,
		},
		defaults,
	)
}

/** The item of `entries` with `key`, or `undefined`. */
function findItem(entries: ContextMenuEntry[], key: string): ContextMenuItem | undefined {
	return entries.find((entry): entry is ContextMenuItem => 'key' in entry && entry.key === key)
}

/** The buttons of a chart in the header row of a box. @internal */
export type ChartHeaderRow = {
	/** The View data item, when it has an action. The row then shows its button. */
	viewData: ContextMenuItem | undefined
	/** The row shows the touch menu button. */
	menu: boolean
	/** The row shows the menu button, and the menu has the Fullscreen item. */
	ownFullscreen: boolean
}

/**
 * The buttons that a chart puts in the header row of a box, from the entries of
 * its menu. The chart and `ChartHeaderActionsFallback` read this one rule. The
 * menu button shows when `button` is on and the menu has an entry.
 *
 * @internal
 */
export function chartHeaderRow(
	entries: ContextMenuEntry[],
	button: boolean | undefined,
): ChartHeaderRow {
	const menu = entries.length > 0 && button === true

	const viewData = findItem(entries, 'view-data')

	return {
		viewData: viewData?.onAction ? viewData : undefined,
		menu,
		ownFullscreen: menu && findItem(entries, 'fullscreen') !== undefined,
	}
}
