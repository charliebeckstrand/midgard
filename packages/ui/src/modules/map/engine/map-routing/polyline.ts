/**
 * The encoded-polyline codec. Valhalla answers its OSRM-mode requests with
 * precision-6 delta strings — a smaller payload and a cheaper parse than the
 * equivalent GeoJSON coordinate array — so the decode lives here, apart from
 * the clients that ask for it.
 */

import type { LngLat } from '../types'

/**
 * Decodes one zig-zag varint from `encoded` at `start`: the value, the index
 * just past it, and whether it terminated within bounds. The polyline codec
 * packs each coordinate delta this way — 5-bit chunks, low chunk first, high bit
 * set while more follow, the final value zig-zag-encoded so small negatives stay
 * short. `ok` is `false` when the chunks run off the end of a truncated string,
 * so the caller can drop the partial coordinate rather than read `charCodeAt`'s
 * `NaN` as a zero chunk.
 *
 * @internal
 */
function decodeVarint(
	encoded: string,
	start: number,
): { value: number; next: number; ok: boolean } {
	let index = start

	let result = 0

	let shift = 0

	let byte: number

	do {
		if (index >= encoded.length) return { value: 0, next: index, ok: false }

		byte = encoded.charCodeAt(index++) - 63

		result |= (byte & 0x1f) << shift

		shift += 5
	} while (byte >= 0x20)

	return { value: result & 1 ? ~(result >> 1) : result >> 1, next: index, ok: true }
}

/**
 * Decodes an encoded polyline to `LngLat` pairs. Valhalla's OSRM-mode
 * `shape_format: 'polyline6'` answers with precision-6 strings, so the delta
 * `factor` is `1e6`. The codec stores each pair lat-then-lng, so every point is
 * emitted swapped to the module's `[lon, lat]` order.
 *
 * @internal
 */
export function decodePolyline(encoded: string, factor = 1e6): LngLat[] {
	const points: LngLat[] = []

	let index = 0

	let lat = 0

	let lng = 0

	while (index < encoded.length) {
		const dLat = decodeVarint(encoded, index)

		const dLng = decodeVarint(encoded, dLat.next)

		// A truncated payload leaves the final pair incomplete; drop it rather than
		// push a coordinate built from a zeroed delta.
		if (!dLat.ok || !dLng.ok) break

		lat += dLat.value

		lng += dLng.value

		index = dLng.next

		points.push([lng / factor, lat / factor])
	}

	return points
}
