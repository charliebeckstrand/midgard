import type { LngLat, RouteData } from './types'

export type SegmentStatus = 'pending' | 'active' | 'done'

/**
 * Build one GeoJSON LineString feature per segment between consecutive stops,
 * tagged with the status that determines its color.
 *
 * Segment rule: a segment inherits its starting stop's status; a done → active
 * transition keeps the completed portion green up to the current position.
 */
export function toSegmentCollection(data: RouteData) {
	const path: LngLat[] = data.path ?? data.stops.map((s) => s.position)

	const segments: Array<{
		type: 'Feature'
		geometry: { type: 'LineString'; coordinates: LngLat[] }
		properties: { status: SegmentStatus; index: number }
	}> = []

	for (let i = 0; i < path.length - 1; i++) {
		const fromPoint = path[i]

		const toPoint = path[i + 1]

		if (!fromPoint || !toPoint) continue

		const from = data.stops[i]?.status

		const to = data.stops[i + 1]?.status

		let status: SegmentStatus = 'pending'

		if (from === 'done' && (to === 'done' || to === 'active')) status = 'done'
		else if (from === 'active' || to === 'active') status = 'active'
		else if (from === 'done') status = 'done'

		segments.push({
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: [fromPoint, toPoint] },
			properties: { status, index: i },
		})
	}

	return { type: 'FeatureCollection' as const, features: segments }
}

export function toColorMatch(colors: Record<SegmentStatus, string>) {
	return [
		'match',
		['get', 'status'],
		'done',
		colors.done,
		'active',
		colors.active,
		colors.pending,
	] as const
}

export function formatTimestamp(ts?: string | Date) {
	if (!ts) return null

	const date = typeof ts === 'string' ? new Date(ts) : ts

	if (Number.isNaN(date.getTime())) return null

	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

export function resolveCurrentIndex(stops: RouteData['stops']) {
	const activeIndex = stops.findIndex((s) => s.status === 'active')

	if (activeIndex !== -1) return activeIndex

	const doneCount = stops.filter((s) => s.status === 'done').length

	return Math.min(doneCount, Math.max(stops.length - 1, 0))
}
