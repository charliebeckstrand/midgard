'use client'

import { EllipsisVertical } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '../../../components/button'
import { type ContextMenuEntry, ContextMenuList } from '../../../components/context-menu'
import { Icon } from '../../../components/icon'
import { Menu, MenuContent, MenuTrigger } from '../../../components/menu'
import { cn, createContext } from '../../../core'
import { useHeaderActionsHost } from '../../../primitives/header-actions'

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
	 * inside such a box. The frame renders both copies, so exactly one shows.
	 */
	place: 'host' | 'header'
}

/**
 * A button that opens the chart menu, for a touch screen. The menu opens on a
 * right-click, and a touch screen has none. A long press on a chart reads the
 * marks and does not open the menu. So the button is the one way to the menu
 * there. It shows only where the primary pointer is coarse, and it holds the
 * same entries as the right-click menu.
 *
 * Inside a box that gives a header actions element ({@link useHeaderActionsHost}),
 * such as a dashboard tile, the button goes into the header row of the box with a
 * portal. Otherwise it sits at the end of the chart header. A chart with no
 * title then has no button. The button covers no mark in either place.
 *
 * @internal
 */
export function ChartMenuButton({ title, place }: ChartMenuButtonProps) {
	const entries = useChartMenuEntries()

	const host = useHeaderActionsHost()

	if (entries === null || entries.length === 0) return null

	if ((place === 'host') !== (host !== null)) return null

	const button = (
		<div
			data-slot="chart-menu-button"
			// In the chart header the box keeps the height of one header line, and the
			// button overflows it. The tier reserve of the header then stays correct.
			className={cn('hidden shrink-0 items-center pointer-coarse:flex', host === null && 'h-6')}
		>
			<Menu placement="bottom-end">
				<MenuTrigger>
					<Button type="button" variant="bare" aria-label={title ? `${title} menu` : 'Chart menu'}>
						<Icon icon={<EllipsisVertical />} />
					</Button>
				</MenuTrigger>

				<MenuContent>
					<ContextMenuList entries={entries} />
				</MenuContent>
			</Menu>
		</div>
	)

	return host === null ? button : createPortal(button, host)
}
