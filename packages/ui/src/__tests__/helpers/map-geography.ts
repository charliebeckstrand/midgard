import type { MapFeatureCollection, MapTopology } from '../../modules/map'

/**
 * A three-region test geography: unit squares "Alpha" (id A), "Beta" (id B),
 * and "Gamma" (id C) side by side along the equator — small enough to assert
 * against, wide enough to give the fitted projection a real aspect. Rings
 * follow d3-geo's spherical winding (exterior clockwise in lon/lat order);
 * wound the other way, d3 reads a ring as enclosing the rest of the globe.
 * The GeoJSON collection and the TopoJSON topology encode the same shapes,
 * so either input path drives identical output.
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
