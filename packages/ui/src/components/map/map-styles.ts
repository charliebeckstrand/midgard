import type { StyleSpecification } from 'maplibre-gl'

export type MapPreset = 'demo' | 'osm' | 'positron' | 'dark-matter' | 'satellite'

const DEMO = 'https://demotiles.maplibre.org/style.json'

function rasterStyle(tiles: string[], attribution: string, maxzoom = 19): StyleSpecification {
	return {
		version: 8,
		sources: {
			raster: {
				type: 'raster',
				tiles,
				tileSize: 256,
				attribution,
			},
		},
		layers: [
			{
				id: 'raster',
				type: 'raster',
				source: 'raster',
				minzoom: 0,
				maxzoom,
			},
		],
	}
}

export const MAP_PRESETS: Record<MapPreset, string | StyleSpecification> = {
	demo: DEMO,
	osm: rasterStyle(
		['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
		'© OpenStreetMap contributors',
	),
	positron: rasterStyle(
		[
			'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
			'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
			'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
		],
		'© OpenStreetMap contributors © CARTO',
	),
	'dark-matter': rasterStyle(
		[
			'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
			'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
			'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
		],
		'© OpenStreetMap contributors © CARTO',
	),
	satellite: rasterStyle(
		[
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		],
		'Tiles © Esri',
	),
}
