/**
 * The messages of the chart chrome: the menu and its actions, the data dialog,
 * the fullscreen dialog, and the legend.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape, MessageSet } from '../../../primitives/intl/types'

// The values of each chart message, by key.
type ChartValues = {
	chart: Record<never, never>
	menu: { title: string }
	untitledMenu: Record<never, never>
	viewData: Record<never, never>
	viewDataFor: { title: string }
	data: Record<never, never>
	fullscreen: Record<never, never>
	downloadPng: Record<never, never>
	downloadJpg: Record<never, never>
	downloadCsv: Record<never, never>
	copyData: Record<never, never>
	legend: Record<never, never>
	previousEntries: Record<never, never>
	nextEntries: Record<never, never>
	showMore: { count: number }
	moreEntries: Record<never, never>
	value: Record<never, never>
}

/**
 * The messages of the chart chrome, by key.
 *
 * @internal
 */
export const chartMessages: MessageSet<ChartValues> = defineMessages<ChartValues>({
	chart: {
		id: 'ui.chart.chart',
		defaultMessage: 'Chart',
		description: 'The name of the fullscreen dialog of a chart that has no title.',
	},
	menu: {
		id: 'ui.chart.menu',
		defaultMessage: '{title} menu',
		description: 'The name of the menu of a chart. The title is the title of the chart.',
	},
	untitledMenu: {
		id: 'ui.chart.untitledMenu',
		defaultMessage: 'Chart menu',
		description: 'The name of the menu of a chart that has no title.',
	},
	viewData: {
		id: 'ui.chart.viewData',
		defaultMessage: 'View data',
		description: 'The action that opens a dialog with the values of a chart as a table.',
	},
	viewDataFor: {
		id: 'ui.chart.viewDataFor',
		defaultMessage: 'View data for {title}',
		description:
			'The name of the button that opens a dialog with the values of a chart as a table. The title is the title of the chart.',
	},
	data: {
		id: 'ui.chart.data',
		defaultMessage: 'Chart data',
		description: 'The title of the dialog with the values of a chart that has no title.',
	},
	fullscreen: {
		id: 'ui.chart.fullscreen',
		defaultMessage: 'Fullscreen',
		description: 'The action that opens a chart in a large dialog.',
	},
	downloadPng: {
		id: 'ui.chart.downloadPng',
		defaultMessage: 'Download PNG',
		description: 'The action that downloads a chart as a PNG image.',
	},
	downloadJpg: {
		id: 'ui.chart.downloadJpg',
		defaultMessage: 'Download JPG',
		description: 'The action that downloads a chart as a JPG image.',
	},
	downloadCsv: {
		id: 'ui.chart.downloadCsv',
		defaultMessage: 'Download CSV',
		description: 'The action that downloads the values of a chart as a CSV file.',
	},
	copyData: {
		id: 'ui.chart.copyData',
		defaultMessage: 'Copy data',
		description: 'The action that copies the values of a chart to the clipboard.',
	},
	legend: {
		id: 'ui.chart.legend',
		defaultMessage: 'Legend',
		description: 'The name of the legend of a chart, which names the series by their colors.',
	},
	previousEntries: {
		id: 'ui.chart.previousEntries',
		defaultMessage: 'Previous legend entries',
		description: 'The name of the button that shows the page of legend entries before.',
	},
	nextEntries: {
		id: 'ui.chart.nextEntries',
		defaultMessage: 'Next legend entries',
		description: 'The name of the button that shows the page of legend entries after.',
	},
	showMore: {
		id: 'ui.chart.showMore',
		defaultMessage: 'Show {count} more',
		description:
			'The name of the button that shows the legend entries that do not fit. The count is the number of those entries.',
	},
	moreEntries: {
		id: 'ui.chart.moreEntries',
		defaultMessage: 'More legend entries',
		description: 'The name of the panel with the legend entries that do not fit.',
	},
	value: {
		id: 'ui.chart.value',
		defaultMessage: 'Value',
		description: 'The name of the color scale bar of a chart that has no name of its own.',
	},
})

/**
 * The name of the menu of a chart, such as "Revenue menu", or "Chart menu" for
 * a chart with no title. The right-click menu and the menu button share it,
 * because the two hold the same entries.
 *
 * @internal
 */
export function chartMenuName(intl: IntlShape, title: string | undefined): string {
	return title
		? intl.formatMessage(chartMessages.menu, { title })
		: intl.formatMessage(chartMessages.untitledMenu)
}
