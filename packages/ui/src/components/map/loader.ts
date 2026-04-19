import type {
	AttributionControl as MapLibreAttributionControl,
	Map as MapLibreMap,
	Marker as MapLibreMarker,
} from 'maplibre-gl'

type MapLibreModule = {
	Map: typeof MapLibreMap
	Marker: typeof MapLibreMarker
	AttributionControl: typeof MapLibreAttributionControl
}

let promise: Promise<MapLibreModule> | null = null

/**
 * Load maplibre-gl lazily and share the result across all components. A single
 * pending promise prevents concurrent `import()` calls from racing — the second
 * caller awaits the first caller's resolution.
 */
export function loadMapLibre(): Promise<MapLibreModule> {
	if (!promise) {
		promise = import('maplibre-gl') as Promise<MapLibreModule>
	}

	return promise
}
