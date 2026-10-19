import { defineMessage, defineMessages } from '../../primitives/intl/intl-messages'
import type { TypedMessageDescriptor } from '../../primitives/intl/types'

/**
 * The messages of a map: the name of its legend, the header of the value
 * column of its data table, and the announcement of a zoom reset.
 *
 * @internal
 */
export const mapMessages = defineMessages({
	legend: {
		id: 'ui.map.legend',
		defaultMessage: 'Legend',
		description: 'The name of the legend of a map, which names the categories by their colors.',
	},
	detail: {
		id: 'ui.map.detail',
		defaultMessage: 'Detail',
		description:
			'The header of the value column of the data table of a map, when the map names no category field.',
	},
	zoomReset: {
		id: 'ui.map.zoomReset',
		defaultMessage: 'Zoom reset',
		description: 'Spoken when a key puts the zoom of a map back to its fit.',
	},
})

/**
 * The announcement of a zoom step, such as "Zoom 150%". It takes the `scale`
 * as a share of the fit, where `1` is the fit.
 *
 * @internal
 */
export const mapZoomMessage: TypedMessageDescriptor<{ scale: number }> = defineMessage<{
	scale: number
}>({
	id: 'ui.map.zoom',
	defaultMessage: 'Zoom {scale, number, percent}',
	description:
		'Spoken when a key zooms a map in or out, with the zoom as a percent of the fit, such as "Zoom 150%".',
})
