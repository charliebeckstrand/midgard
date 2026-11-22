import { defineMessage, defineMessages } from '../../primitives/intl/intl-messages'
import type { IntlShape, TypedMessageDescriptor } from '../../primitives/intl/types'
import { MAP_ZOOM_FIT } from './engine/map-constants'
import type { MapTransform } from './engine/map-zoom/transform'

/**
 * The messages of a map. They name the legend, head the value column of the
 * data table, name the zoom buttons, announce a zoom reset, and name each
 * mark kind.
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
		description: 'Spoken when a key or the reset button puts the zoom of a map back to its fit.',
	},
	zoomControls: {
		id: 'ui.map.zoomControls',
		defaultMessage: 'Zoom',
		description: 'The name of the group of zoom buttons of a map.',
	},
	zoomIn: {
		id: 'ui.map.zoomIn',
		defaultMessage: 'Zoom in',
		description: 'The name of the button that zooms a map in one step.',
	},
	zoomOut: {
		id: 'ui.map.zoomOut',
		defaultMessage: 'Zoom out',
		description: 'The name of the button that zooms a map out one step.',
	},
	zoomFit: {
		id: 'ui.map.zoomFit',
		defaultMessage: 'Reset zoom',
		description: 'The name of the button that puts the zoom of a map back to its fit.',
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
		'Spoken when a key or a zoom button zooms a map in or out, with the zoom as a percent of the fit, such as "Zoom 150%".',
})

/**
 * The view scale as one short line of text, for the announcement of a zoom
 * step: the scale as a percent of the fit. The zoom keys and the zoom buttons
 * speak the same line.
 *
 * @internal
 */
export function describeZoom(intl: IntlShape, transform: MapTransform): string {
	return intl.formatMessage(mapZoomMessage, { scale: transform.k / MAP_ZOOM_FIT })
}

/**
 * The name of a row of the data table of a map that the map holds selected,
 * such as "Ohio, selected". It takes the `name` of the region or the mark.
 *
 * @internal
 */
export const mapSelectedRowMessage: TypedMessageDescriptor<{ name: string }> = defineMessage<{
	name: string
}>({
	id: 'ui.map.selectedRow',
	defaultMessage: '{name}, selected',
	description:
		'The name of a row of the data table of a map for a region or a mark that the map holds selected, such as "Ohio, selected".',
})
