'use client'

import { createPortal } from 'react-dom'
import { ContextMenuList } from '../../../components/context-menu'
import type { ContextMenuEntry, ContextMenuItem } from '../../../components/context-menu/types'
import { Menu, MenuContent, MenuTrigger } from '../../../components/menu'
import { dataAttr } from '../../../core/data-attr'
import { useHeaderActionsSlotted } from '../../../primitives/header-actions/context'
import { useHeaderActions } from '../../../primitives/header-actions/use-header-actions'
import {
	ChartMenuButtonBox,
	ChartMenuTriggerButton,
	ChartViewDataButton,
} from './chart-header-actions-fallback'
import { useChartMenu } from './context'

/** Props for {@link ChartMenuButton}. @internal */
export type ChartMenuButtonProps = {
	/** The chart title, which names the button. */
	title?: string
	/**
	 * Where this copy of the button renders. `'host'` puts it in the header row
	 * of the box around the chart, and renders nothing outside such a box.
	 * `'header'` puts it at the end of the chart header, and renders nothing
	 * inside such a box. `'corner'` puts it in the top end corner of the nearest
	 * positioned ancestor, for a chart that draws no inline header, and renders
	 * nothing inside such a box. A chart renders the host copy and one other
	 * copy, so at most one shows.
	 */
	place: 'host' | 'header' | 'corner'
}

/** The item of `entries` with `key`, or `undefined`. */
function findItem(entries: ContextMenuEntry[], key: string): ContextMenuItem | undefined {
	return entries.find((entry): entry is ContextMenuItem => 'key' in entry && entry.key === key)
}

/**
 * A button that opens the chart menu, for a touch screen. The menu opens on a
 * right-click, and on a touch screen on a hold. The button is a second way to
 * the menu there, which a reader can see. It shows only where the primary
 * pointer is coarse, and only when the chart turns it on with
 * `contextMenu.button`. It holds the same entries as the right-click menu.
 *
 * Inside a box that gives a header actions element ({@link useHeaderActions}),
 * such as a dashboard tile, the button goes into the header row of the box with a
 * portal. Otherwise it sits at the end of the chart header. The button covers no
 * mark in either place. The portal needs the element, which comes after the
 * mount. In a box that sets `slotted` on its `HeaderActions`, the server render
 * thus shows no button. A {@link ChartHeaderActionsFallback} in the slot draws
 * the same buttons until the chart puts its own there.
 *
 * A chart that draws no inline header puts the button in the top end corner of
 * the chart instead: the heatmap, the choropleth, a chart with `heading` off, a
 * chart with no title or subtitle, and a spark chart, whose header is a veil
 * that shows no button. There it can cover a mark, but it reserves no height.
 *
 * In the header row of a box, a View data button comes before the menu
 * button on each pointer, when the menu has the View data entry. It shows also
 * when the menu button is off. When the menu button shows and the menu has the
 * Fullscreen entry, the row carries `data-own-fullscreen`, and the box can hide
 * its own expand control.
 *
 * @internal
 */
export function ChartMenuButton({ title, place }: ChartMenuButtonProps) {
	const chartMenu = useChartMenu()

	const host = useHeaderActions()

	// A box that renders its slot gets the host copy alone. The element of the
	// slot comes only after the mount, so without this the server render puts
	// the other copy in the chart, and the button moves at hydration.
	const slotted = useHeaderActionsSlotted()

	if (chartMenu === null || chartMenu.entries.length === 0) return null

	if (place === 'host' ? host === null : host !== null || slotted) return null

	const { entries, button, capped } = chartMenu

	const menu = button ? (
		<ChartMenuButtonBox place={place}>
			<Menu placement="bottom-end" capped={capped}>
				<MenuTrigger>
					<ChartMenuTriggerButton title={title} />
				</MenuTrigger>

				<MenuContent>
					<ContextMenuList entries={entries} />
				</MenuContent>
			</Menu>
		</ChartMenuButtonBox>
	) : null

	if (host === null) return menu

	const viewData = findItem(entries, 'view-data')

	if (menu === null && !viewData?.onAction) return null

	return createPortal(
		<span
			data-slot="chart-header-actions"
			data-own-fullscreen={dataAttr(button && findItem(entries, 'fullscreen') !== undefined)}
			className="contents"
		>
			{viewData?.onAction && (
				<ChartViewDataButton
					title={title}
					disabled={viewData.disabled}
					onClick={viewData.onAction}
				/>
			)}

			{menu}
		</span>,
		host,
	)
}
