/** `[longitude, latitude]`: MapLibre / GeoJSON order, opposite of the idiomatic "lat / lng". */
export type LngLat = [number, number]

export type RouteStop = {
	id: string
	name: string
	position: LngLat
	timestamp?: string | Date
	description?: string
	status?: 'pending' | 'active' | 'done'
}

export type RouteData = {
	id: string
	stops: RouteStop[]
	/** Optional pre-computed path. If omitted, the path is drawn between stops in order. */
	path?: LngLat[]
}

export type GeofenceShape =
	| { type: 'circle'; center: LngLat; radiusMeters: number }
	| { type: 'polygon'; coordinates: LngLat[] }

/** A single message in a shipment's chat thread; local to `map/`, not the `ChatMessage` component. */
export type ChatMessage = {
	id: string
	author: 'me' | 'them'
	body: string
	timestamp?: string | Date
}

export type ShipmentData = {
	id: string
	label: string
	position: LngLat
	status?: string
	eta?: string | Date
	info?: Array<{ label: string; value: string }>
	messages?: ChatMessage[]
}
