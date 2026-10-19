'use client'

import { EllipsisVertical, Table2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '../../../components/button'
import {
	type ContextMenuEntry,
	type ContextMenuItem,
	ContextMenuList,
} from '../../../components/context-menu'
import { Icon } from '../../../components/icon'
import { Menu, MenuContent, MenuTrigger } from '../../../components/menu'
import { cn, createContext, dataAttr } from '../../../core'
import { useHeaderActions } from '../../../primitives/header-actions'
import { useIntl } from '../../../primitives/intl/use-intl'
import { chartMenuName, chartMessages } from './chart-messages'

/**
 * The entries of the chart menu, which {@link ChartContextMenu} publishes for
 * {@link ChartMenuButton}. It is `null` where the chart has no menu: under
 * `contextMenu={false}`, in the fullscreen copy, or outside a chart.
 *
 * @internal
 */
export const [ChartMenuEntriesContext, useChartMenuEntries] = createContext<
	ContextMenuEntry[] | null
>('ChartMenuEntries', { default: null })

/** Props for {@link ChartMenuButton}. @internal */
export type ChartMenuButtonProps = {
	/** The chart title, which names the button. */
	title?: string
	/**
	 * Where this copy of the button renders. `'host'` puts it in the header row
	 * of the box around the chart, and renders nothing outside such a box.
	 * `'header'` puts it at the end of the chart header, and renders nothing
	 * inside such a box. `'corner'` puts it in the top end corner of the nearest
	 * positioned ancestor, for a chart that draws no header, and renders nothing
	 * inside such a box. A chart renders the host copy and one other copy, so
	 * exactly one shows.
	 */
	place: 'host' | 'header' | 'corner'
}

/** The item of `entries` with `key`, or `undefined`. */
function itemOf(entries: ContextMenuEntry[], key: string): ContextMenuItem | undefined {
	return entries.find((entry): entry is ContextMenuItem => 'key' in entry && entry.key === key)
}

/**
 * A button that opens the chart menu, for a touch screen. The menu opens on a
 * right-click, and a touch screen has none. A touch on a chart opens no
 * readout and no menu. So the button is the one way to the menu there. It
 * shows only where the primary pointer is coarse, and it holds the same
 * entries as the right-click menu.
 *
 * Inside a box that gives a header actions element ({@link useHeaderActions}),
 * such as a dashboard tile, the button goes into the header row of the box with a
 * portal. Otherwise it sits at the end of the chart header. A chart with no
 * title then has no button. The button covers no mark in either place.
 *
 * A chart that draws no header, such as the heatmap and the choropleth, puts
 * the button in the top end corner of the chart instead. There it can cover a
 * mark, but it reserves no height.
 *
 * In the header row of a box, a View data button comes before the menu
 * button on each pointer, when the menu has the View data entry. The menu has
 * the Fullscreen entry, so the row carries `data-own-fullscreen`, and the box
 * can hide its own expand control.
 *
 * @internal
 */
export function ChartMenuButton({ title, place }: ChartMenuButtonProps) {
	const entries = useChartMenuEntries()

	const host = useHeaderActions()

	const intl = useIntl()

	if (entries === null || entries.length === 0) return null

	if ((place === 'host') !== (host !== null)) return null

	const menu = (
		<div
			data-slot="chart-menu-button"
			// In the chart header the box keeps the height of one header line, and the
			// button overflows it. The tier reserve of the header then stays correct.
			className={cn(
				'hidden shrink-0 items-center pointer-coarse:flex',
				place === 'header' && 'h-6',
				place === 'corner' && 'absolute end-0 top-0 z-10',
			)}
		>
			<Menu placement="bottom-end">
				<MenuTrigger>
					<Button type="button" variant="bare" aria-label={chartMenuName(intl, title)}>
						<Icon icon={<EllipsisVertical />} />
					</Button>
				</MenuTrigger>

				<MenuContent>
					<ContextMenuList entries={entries} />
				</MenuContent>
			</Menu>
		</div>
	)

	if (host === null) return menu

	const viewData = itemOf(entries, 'view-data')

	return createPortal(
		<span
			data-slot="chart-header-actions"
			data-own-fullscreen={dataAttr(itemOf(entries, 'fullscreen') !== undefined)}
			className="contents"
		>
			{viewData?.onAction && (
				<Button
					type="button"
					variant="bare"
					data-slot="chart-view-data"
					disabled={viewData.disabled}
					aria-label={
						title
							? intl.formatMessage(chartMessages.viewDataFor, { title })
							: intl.formatMessage(chartMessages.viewData)
					}
					onClick={viewData.onAction}
				>
					<Icon icon={<Table2 />} />
				</Button>
			)}

			{menu}
		</span>,
		host,
	)
}
