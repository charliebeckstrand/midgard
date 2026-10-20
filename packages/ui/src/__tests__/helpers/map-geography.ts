import type { MapFeatureCollection, MapTopology } from '../../modules/map'

/**
 * A test geography of three regions: the squares "Alpha" (id A), "Beta" (id
 * B), and "Gamma" (id C), side by side along the equator. It is small enough
 * to assert against, and wide enough to give the fitted projection a real
 * aspect. The rings follow the spherical winding of d3-geo, with the exterior
 * clockwise in lon/lat order. d3 reads a ring with the other winding as the
 * rest of the globe. The GeoJSON collection and the TopoJSON topology hold the
 * same shapes, so the two input paths give the same output.
 */
export const FIXTURE_GEOJSON: MapFeatureCollection = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			id: 'A',
			properties: { name: 'Alpha' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[0, 0],
						[0, 10],
						[10, 10],
						[10, 0],
						[0, 0],
					],
				],
			},
		},
		{
			type: 'Feature',
			id: 'B',
			properties: { name: 'Beta' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[10, 0],
						[10, 10],
						[20, 10],
						[20, 0],
						[10, 0],
					],
				],
			},
		},
		{
			type: 'Feature',
			id: 'C',
			properties: { name: 'Gamma' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[20, 0],
						[20, 10],
						[30, 10],
						[30, 0],
						[20, 0],
					],
				],
			},
		},
	],
}

/** The same three squares as a (non-quantized) TopoJSON topology, one arc per ring. */
export const FIXTURE_TOPOLOGY: MapTopology = {
	type: 'Topology',
	objects: {
		states: {
			type: 'GeometryCollection',
			geometries: [
				{ type: 'Polygon', arcs: [[0]], id: 'A', properties: { name: 'Alpha' } },
				{ type: 'Polygon', arcs: [[1]], id: 'B', properties: { name: 'Beta' } },
				{ type: 'Polygon', arcs: [[2]], id: 'C', properties: { name: 'Gamma' } },
			],
		},
	},
	arcs: [
		[
			[0, 0],
			[0, 10],
			[10, 10],
			[10, 0],
			[0, 0],
		],
		[
			[10, 0],
			[10, 10],
			[20, 10],
			[20, 0],
			[10, 0],
		],
		[
			[20, 0],
			[20, 10],
			[30, 10],
			[30, 0],
			[20, 0],
		],
	],
}

/** Rows matching Alpha and Beta by id; Gamma stays unmatched (the neutral fill). */
export const FIXTURE_ROWS = [
	{ state: 'A', zone: 'East' },
	{ state: 'B', zone: 'West' },
]
