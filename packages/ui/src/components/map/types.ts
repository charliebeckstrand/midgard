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
	| { kind: 'circle'; center: LngLat; radiusMeters: number }
	| { kind: 'polygon'; coordinates: LngLat[] }

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
