import { describe, expect, it } from 'vitest'
import { clusterPoints } from '../../modules/map/engine/map-cluster/group'
import { POINT_RADIUS } from '../../modules/map/engine/map-constants'
import { clientToFrame, frameToClient } from '../../modules/map/engine/map-projection/frame'
import {
	mapZoomKey,
	pointerGap,
	pointerMidpoint,
	wheelZoomFactor,
	zoomKeyFactor,
} from '../../modules/map/engine/map-zoom/gesture'
import { mapZoomSettings } from '../../modules/map/engine/map-zoom/input'
import {
	applyTransform,
	constrainTransform,
	MAP_FIT_TRANSFORM,
	type MapTransform,
	panTransform,
	sameTransform,
	showTransform,
	transformAttribute,
	zoomTransform,
} from '../../modules/map/engine/map-zoom/transform'
import type { LngLat, MapPoint2D } from '../../modules/map/engine/types'

/**
 * The zoom's pure half: the transform the layer draws through, the gestures that
 * move it, and the two places a scale has to reach past the layer — the
 * frame-to-viewport conversion the readout anchors by, and the pixel merge
 * distance the dots group under.
 */

const VIEW = { width: 400, height: 200 }

const MAX = 8

/** The plot SVG's box, as `getBoundingClientRect` reports it for a measured frame. */
const BOX = { left: 0, top: 0, width: 400, height: 200 }

describe('mapZoomSettings', () => {
	it("reads the prop's three on-forms to one ceiling", () => {
		expect(mapZoomSettings(true)).toEqual({ max: 8, modifier: null })

		expect(mapZoomSettings(12)).toEqual({ max: 12, modifier: null })

		expect(mapZoomSettings({ max: 12 })).toEqual({ max: 12, modifier: null })

		expect(mapZoomSettings({})).toEqual({ max: 8, modifier: null })
	})

	it('carries the modifier the object form names', () => {
		expect(mapZoomSettings({ modifier: 'shift' })).toEqual({ max: 8, modifier: 'shift' })
	})

	it('reads every off-form, and a ceiling the fit already reaches, as no zoom', () => {
		// A ceiling at or under the fit could never move, and such a map must take
		// none of what a zoom costs — no tab stop it cannot answer, no claim on
		// touch, and no layer.
		for (const off of [false, undefined, 0, 1, -4, { max: 1 }, { max: 0.5, modifier: 'shift' }]) {
			expect(mapZoomSettings(off as Parameters<typeof mapZoomSettings>[0])).toBeNull()
		}
	})
})

describe('constrainTransform', () => {
	it('holds the fit as the floor, so the geography never draws smaller than the projection framed it', () => {
		const out = constrainTransform({ x: 0, y: 0, k: 0.25 }, VIEW, MAX)

		expect(out.k).toBe(1)
	})

	it('holds the ceiling the caller named', () => {
		expect(constrainTransform({ x: 0, y: 0, k: 100 }, VIEW, MAX).k).toBe(MAX)
	})

	it('pins the offset to nothing at the fit, so a zoomed-out map re-centres itself', () => {
		const out = constrainTransform({ x: -120, y: 40, k: 1 }, VIEW, MAX)

		expect(out).toEqual(MAP_FIT_TRANSFORM)
	})

	it('keeps the frame inside the scaled frame, so a pan never carries the geography off', () => {
		// At k=2 the drawing is 800 x 400, so the view may travel 400 x 200 — and
		// no further in either direction.
		expect(constrainTransform({ x: 50, y: 10, k: 2 }, VIEW, MAX)).toEqual({ x: 0, y: 0, k: 2 })

		expect(constrainTransform({ x: -900, y: -900, k: 2 }, VIEW, MAX)).toEqual({
			x: -400,
			y: -200,
			k: 2,
		})
	})

	it('reads a ceiling under the fit as the fit, so a nonsense prop cannot invert the limits', () => {
		expect(constrainTransform({ x: 0, y: 0, k: 4 }, VIEW, 0.5).k).toBe(1)
	})
})

describe('zoomTransform', () => {
	it('holds the focused ground still under the gesture', () => {
		const focus = { x: 120, y: 80 }

		const out = zoomTransform(MAP_FIT_TRANSFORM, focus, 2, VIEW, MAX)

		// The frame point the gesture was aimed at draws where it drew before, which
		// is the whole contract of a pointer-anchored zoom.
		expect(applyTransform({ x: 120, y: 80 }, out)).toEqual(focus)
	})

	it('holds it still through a second gesture from the zoomed view', () => {
		const first = zoomTransform(MAP_FIT_TRANSFORM, { x: 300, y: 150 }, 3, VIEW, MAX)

		const focus = { x: 90, y: 40 }

		const ground = invert(focus, first)

		const second = zoomTransform(first, focus, 1.5, VIEW, MAX)

		expect(applyTransform(ground, second).x).toBeCloseTo(focus.x, 6)

		expect(applyTransform(ground, second).y).toBeCloseTo(focus.y, 6)
	})

	it('measures the step it took rather than the one it was asked for, so the focus does not slide at the ceiling', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 200, y: 100 }, MAX, VIEW, MAX)

		const out = zoomTransform(at, { x: 200, y: 100 }, 4, VIEW, MAX)

		expect(out).toEqual(at)
	})

	it('returns to the fit as the scale does, however far the view had travelled', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 400, y: 200 }, 6, VIEW, MAX)

		expect(at.x).toBeLessThan(0)

		expect(zoomTransform(at, { x: 400, y: 200 }, 0.01, VIEW, MAX)).toEqual(MAP_FIT_TRANSFORM)
	})
})

describe('panTransform', () => {
	it('moves the view by the offset it is given', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 200, y: 100 }, 2, VIEW, MAX)

		expect(panTransform(at, -30, -10, VIEW)).toEqual({ x: at.x - 30, y: at.y - 10, k: 2 })
	})

	it('stops at the edge rather than past it', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 200, y: 100 }, 2, VIEW, MAX)

		expect(panTransform(at, 9999, 9999, VIEW)).toEqual({ x: 0, y: 0, k: 2 })
	})
})

describe('showTransform', () => {
	const INSET = 32

	it('holds still for a point already inside the frame', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 200, y: 100 }, 2, VIEW, MAX)

		// The frame point draws at the middle of the zoomed view, a clear margin
		// from every edge, so there is nothing for the follow to do.
		expect(applyTransform({ x: 150, y: 75 }, at)).toEqual({ x: 100, y: 50 })

		expect(showTransform(at, { x: 150, y: 75 }, VIEW, INSET)).toEqual(at)
	})

	it('pans until an off-frame point draws inside, clear of the edge', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 0, y: 0 }, 4, VIEW, MAX)

		// The far corner of the geography sits well outside a view zoomed onto the
		// near one, which is exactly where an arrow step can land the cursor.
		const corner = { x: 380, y: 190 }

		expect(applyTransform(corner, at).x).toBeGreaterThan(VIEW.width)

		const out = showTransform(at, corner, VIEW, INSET)

		const drawn = applyTransform(corner, out)

		expect(drawn.x).toBeLessThanOrEqual(VIEW.width - INSET + 1e-9)

		expect(drawn.y).toBeLessThanOrEqual(VIEW.height - INSET + 1e-9)
	})

	it('never leaves the pan limits to honour the margin', () => {
		const at = zoomTransform(MAP_FIT_TRANSFORM, { x: 200, y: 100 }, 2, VIEW, MAX)

		// The frame's own corner cannot be brought a margin clear of the edge — the
		// constraint wins, and the view stops at the boundary rather than exposing
		// ground the fit never framed.
		const out = showTransform(at, { x: 0, y: 0 }, VIEW, INSET)

		expect(out.x).toBe(0)

		expect(out.y).toBe(0)
	})
})

describe('transformAttribute', () => {
	it('writes the translate before the scale, the order SVG applies them', () => {
		expect(transformAttribute({ x: 12, y: -4, k: 2.5 })).toBe('translate(12 -4) scale(2.5)')
	})

	it('rounds, so a gesture never writes a full float into the attribute', () => {
		expect(transformAttribute({ x: 1 / 3, y: 0, k: 1 })).toBe('translate(0.333 0) scale(1)')
	})
})

describe('sameTransform', () => {
	it('reads two equal transforms as one, so a redundant commit can bail', () => {
		expect(sameTransform({ x: 1, y: 2, k: 3 }, { x: 1, y: 2, k: 3 })).toBe(true)

		expect(sameTransform({ x: 1, y: 2, k: 3 }, { x: 1, y: 2, k: 4 })).toBe(false)
	})
})

describe('wheelZoomFactor', () => {
	it('grows the scale on wheel-up and shrinks it on wheel-down', () => {
		expect(wheelZoomFactor(-100, 0)).toBeGreaterThan(1)

		expect(wheelZoomFactor(100, 0)).toBeLessThan(1)
	})

	it('is geometric, so a notch back undoes a notch forward', () => {
		expect(wheelZoomFactor(-100, 0) * wheelZoomFactor(100, 0)).toBeCloseTo(1, 12)
	})

	it('reads a line-mode delta as more travel than a pixel-mode one', () => {
		expect(wheelZoomFactor(-1, 1)).toBeGreaterThan(wheelZoomFactor(-1, 0))
	})
})

describe('pointerGap and pointerMidpoint', () => {
	it('measure a pinch by its spread and hold its middle', () => {
		const a = { x: 0, y: 0 }

		const b = { x: 30, y: 40 }

		expect(pointerGap(a, b)).toBe(50)

		expect(pointerMidpoint(a, b)).toEqual({ x: 15, y: 20 })
	})
})

describe('mapZoomKey', () => {
	it('reads the zoom keys and leaves the cursor its own', () => {
		expect(mapZoomKey('+')).toBe('in')

		expect(mapZoomKey('=')).toBe('in')

		expect(mapZoomKey('-')).toBe('out')

		expect(mapZoomKey('0')).toBe('fit')

		for (const key of ['ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape']) {
			expect(mapZoomKey(key)).toBeNull()
		}
	})

	it('steps in and out by reciprocal factors, so the two keys undo each other', () => {
		expect(zoomKeyFactor('in') * zoomKeyFactor('out')).toBeCloseTo(1, 12)
	})
})

describe('clientToFrame', () => {
	it('inverts frameToClient, so a gesture reads the space the readout writes', () => {
		const at = { x: 137, y: 64 }

		const client = frameToClient(at, BOX, 400, 200)

		expect(client).not.toBeNull()

		const back = client === null ? null : clientToFrame(client, BOX, 400, 200)

		expect(back?.x).toBeCloseTo(at.x, 9)

		expect(back?.y).toBeCloseTo(at.y, 9)
	})

	it('inverts it through a letterboxed box too', () => {
		// A canonical frame is letterboxed until the container is measured, which is
		// the state a wheel can arrive in on the first paint.
		const letterboxed = { left: 20, top: 10, width: 400, height: 400 }

		const at = { x: 137, y: 64 }

		const client = frameToClient(at, letterboxed, 400, 200)

		const back = client === null ? null : clientToFrame(client, letterboxed, 400, 200)

		expect(back?.x).toBeCloseTo(at.x, 9)

		expect(back?.y).toBeCloseTo(at.y, 9)
	})

	it('reports nothing for a frame with no area', () => {
		expect(clientToFrame({ x: 0, y: 0 }, BOX, 0, 200)).toBeNull()

		expect(clientToFrame({ x: 0, y: 0 }, { ...BOX, height: 0 }, 400, 200)).toBeNull()
	})
})

describe('clusterPoints under a zoom', () => {
	/** One frame unit per degree, so a reach reads straight off the coordinates. */
	const flat = (position: LngLat): MapPoint2D => ({ x: position[0], y: position[1] })

	const GAP = 9

	/** Two dots merge under their own widths plus the gap — in device pixels. */
	const REACH = POINT_RADIUS * 2 + GAP

	// A pair a shade closer than the merge distance: one mark at rest, and the
	// pair the moment a zoom spreads them past it.
	const pair: LngLat[] = [
		[0, 0],
		[REACH - 1, 0],
	]

	it('draws a close pair as one summary at rest', () => {
		expect(clusterPoints(pair, flat, GAP)).toHaveLength(1)
	})

	it('separates it once the zoom spreads the dots past the merge distance', () => {
		// At k=2 one device pixel spans half a frame unit, so the reach halves and
		// the pair — unmoved in frame units — no longer meets it.
		expect(clusterPoints(pair, flat, GAP, 0.5)).toHaveLength(2)
	})

	it('merges further out, where the same pixels cover more ground', () => {
		const apart: LngLat[] = [
			[0, 0],
			[REACH * 1.5, 0],
		]

		expect(clusterPoints(apart, flat, GAP)).toHaveLength(2)

		expect(clusterPoints(apart, flat, GAP, 2)).toHaveLength(1)
	})

	it('leaves an opted-out set alone at every scale', () => {
		expect(clusterPoints(pair, flat, null, 0.5)).toHaveLength(2)

		expect(clusterPoints(pair, flat, null, 4)).toHaveLength(2)
	})
})

/** Where a drawn point came from — the transform read backwards, for the fixtures alone. */
function invert(at: MapPoint2D, transform: MapTransform): MapPoint2D {
	return { x: (at.x - transform.x) / transform.k, y: (at.y - transform.y) / transform.k }
}
