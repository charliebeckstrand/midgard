import type { LngLat, RouteData } from './types'

export type SegmentStatus = 'pending' | 'active' | 'done'

/** Index of the path point nearest `position` (squared planar distance). */
function nearestPathIndex(path: LngLat[], position: LngLat): number {
	let best = 0

	let bestDist = Number.POSITIVE_INFINITY

	for (let i = 0; i < path.length; i++) {
		const point = path[i]

		if (!point) continue

		const dx = point[0] - position[0]

		const dy = point[1] - position[1]

		const dist = dx * dx + dy * dy

		if (dist < bestDist) {
			bestDist = dist

			best = i
		}
	}

	return best
}

/** Largest stop index whose boundary path-point sits at or before `segmentIndex`. */
function stopIndexForSegment(boundaries: number[], segmentIndex: number): number {
	let stopIndex = 0

	for (let k = 0; k < boundaries.length; k++) {
		const boundary = boundaries[k]

		if (boundary !== undefined && boundary <= segmentIndex) stopIndex = k
	}

	return stopIndex
}

/**
 * Status of a segment from the statuses of the two stops bounding it. A
 * done → active transition stays `done` so the completed portion still renders
 * green up to the current position — which is why that case is resolved before
 * the general `active` rule.
 */
function segmentStatus(
	from: SegmentStatus | undefined,
	to: SegmentStatus | undefined,
): SegmentStatus {
	if (from === 'done' && (to === 'done' || to === 'active')) return 'done'

	if (from === 'active' || to === 'active') return 'active'

	if (from === 'done') return 'done'

	return 'pending'
}

/**
 * Build one GeoJSON LineString feature per segment between consecutive path
 * points, tagged with the status that determines its color.
 *
 * Segment rule: a segment inherits its starting stop's status; a done → active
 * transition keeps the completed portion green up to the current position. When
 * an explicit `path` is supplied (denser than `stops`), segments are assigned
 * to the stop interval they fall within (each stop matches its nearest path
 * point) instead of indexing `stops` by the dense path index.
 */
export function toSegmentCollection(data: RouteData) {
	const stops = data.stops

	const explicitPath = data.path

	const path: LngLat[] = explicitPath ?? stops.map((s) => s.position)

	// Without an explicit path the points ARE the stops and the mapping is the
	// identity (boundaries[i] === i); otherwise each stop maps to its nearest
	// path point and a segment inherits the interval it lies within.
	const boundaries = explicitPath
		? stops.map((s) => nearestPathIndex(path, s.position))
		: stops.map((_, i) => i)

	const segments: Array<{
		type: 'Feature'
		geometry: { type: 'LineString'; coordinates: LngLat[] }
		properties: { status: SegmentStatus; index: number }
	}> = []

	for (let i = 0; i < path.length - 1; i++) {
		const fromPoint = path[i]

		const toPoint = path[i + 1]

		if (!fromPoint || !toPoint) continue

		const stopIndex = stopIndexForSegment(boundaries, i)

		const status = segmentStatus(stops[stopIndex]?.status, stops[stopIndex + 1]?.status)

		segments.push({
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: [fromPoint, toPoint] },
			properties: { status, index: i },
		})
	}

	return { type: 'FeatureCollection' as const, features: segments }
}

/** MapLibre `match` expression keyed on `properties.status`: paints each segment with its status colour, falling back to `pending`. */
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
