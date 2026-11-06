import { defineMessage, defineMessages } from '../../primitives/intl/intl-messages'
import type { TypedMessageDescriptor } from '../../primitives/intl/types'

/**
 * The messages of a map: the name of its legend, the header of the value
 * column of its data table, the announcement of a zoom reset, and the name of
 * each mark kind.
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
			'The header of the value column of the data table of a map, when the map gives no name for the colored field.',
	},
	zoomReset: {
		id: 'ui.map.zoomReset',
		defaultMessage: 'Zoom reset',
		description: 'Spoken when a key puts the zoom of a map back to its fit.',
	},
	route: {
		id: 'ui.map.kind.route',
		defaultMessage: 'Route',
		description:
			'The value cell of the data table of a map for a route that the map gives no detail for.',
	},
	point: {
		id: 'ui.map.kind.point',
		defaultMessage: 'Point',
		description:
			'The value cell of the data table of a map for a point that the map gives no detail for.',
	},
	marker: {
		id: 'ui.map.kind.marker',
		defaultMessage: 'Marker',
		description:
			'The value cell of the data table of a map for a pair of pins, a start and an end, that the map gives no detail for.',
	},
	geofence: {
		id: 'ui.map.kind.geofence',
		defaultMessage: 'Geofence',
		description:
			'The value cell of the data table of a map for a zone drawn over the map that the map gives no detail for.',
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
