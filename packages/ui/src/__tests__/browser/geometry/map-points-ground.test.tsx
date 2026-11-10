import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoints } from '../../../modules/map'
import { POINT_HIT_RADIUS, POINT_RADIUS } from '../../../modules/map/engine/map-constants'
import { k } from '../../../recipes/kata/map'
import { allBySlot, renderUI } from '../../helpers'
import { getCenter, type Point } from '../../helpers/geometry/box'
import { englishRadius } from '../../helpers/map-flat'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/**
 * The finger targets of a set's dots, in a real browser, where hit testing resolves one target
 * through the clip of another.
 *
 * This browser drives a mouse, so the fine class narrows each target. A touchscreen keeps the whole
 * coarse reach on every dot. Each case takes the fine class off the targets, so the browser hit
 * tests the circles a finger meets.
 */

/** Takes the fine-pointer narrowing off every dot target, as a touchscreen resolves it. */
function asTouch(targets: Element[]) {
	for (const target of targets) target.classList.remove(...k.hit.fine.split(' '))
}

/** The point `distance` px from `from` toward `to`. */
function toward(from: Point, to: Point, distance: number): Point {
	const length = Math.hypot(to.x - from.x, to.y - from.y)

	return {
		x: from.x + ((to.x - from.x) / length) * distance,
		y: from.y + ((to.y - from.y) / length) * distance,
	}
}

/** The entry at `index`, which the case has already counted. */
function nth<T>(list: readonly T[], index: number): T {
	const entry = list[index]

	if (entry === undefined) throw new Error(`No entry at ${index}`)

	return entry
}

/** What the pointer meets at `point`. */
function hitAt(point: Point) {
	return document.elementFromPoint(point.x, point.y)
}

describe('MapPoints finger targets between close dots', () => {
	it('keeps a lone dot between two summaries tappable over its whole face', () => {
		// The Places shape: a lone dot on the line between two summaries, each a few pixels clear of it.
		// Every coarse target reaches past the faces beside it, so a summary drawn later took the edge
		// of the dot, and the gap toward it.
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoints
					label="Stops"
					points={[
						{ at: [12.8, 5] },
						{ at: [13.1, 5] },
						{ at: [15, 5] },
						{ at: [16.9, 5] },
						{ at: [17.2, 5] },
					]}
				/>
			</MapPlat>,
		)

		const targets = allBySlot(container, 'map-points-hit')

		// Two summaries and the lone dot between them, or the case below asserts nothing.
		expect(targets).toHaveLength(3)

		asTouch(targets)

		const leftHit = nth(targets, 0)

		const middleHit = nth(targets, 1)

		const rightHit = nth(targets, 2)

		const left = getCenter(leftHit)

		const middle = getCenter(middleHit)

		const right = getCenter(rightHit)

		const summary = englishRadius(2)

		// The summaries stand close enough that the coarse targets overlap the dot's face.
		const gap = Math.hypot(right.x - middle.x, right.y - middle.y)

		expect(gap).toBeLessThan(POINT_HIT_RADIUS + POINT_RADIUS)

		// The whole face of each mark answers that mark.
		for (const [from, to, own] of [
			[middle, right, middleHit],
			[middle, left, middleHit],
			[right, middle, rightHit],
			[left, middle, leftHit],
		] as const) {
			const face = own === middleHit ? POINT_RADIUS : summary

			expect(hitAt(from)).toBe(own)

			expect(hitAt(toward(from, to, face - 1))).toBe(own)
		}

		// The gap between two faces divides once, midway: the nearer mark takes each side of it.
		for (const [from, to, own, other] of [
			[middle, right, middleHit, rightHit],
			[middle, left, middleHit, leftHit],
		] as const) {
			const half = Math.hypot(to.x - from.x, to.y - from.y) / 2

			expect(hitAt(toward(from, to, half - 1.5))).toBe(own)

			expect(hitAt(toward(from, to, half + 1.5))).toBe(other)
		}
	})

	it('keeps the whole outward reach of each dot', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoints label="Stops" points={[{ at: [14, 5] }, { at: [16, 5] }]} cluster={false} />
			</MapPlat>,
		)

		const targets = allBySlot(container, 'map-points-hit')

		asTouch(targets)

		const aHit = nth(targets, 0)

		const bHit = nth(targets, 1)

		const a = getCenter(aHit)

		const b = getCenter(bHit)

		// Away from the neighbor, each target keeps its finger reach.
		expect(hitAt(toward(a, b, -(POINT_HIT_RADIUS - 2)))).toBe(aHit)

		expect(hitAt(toward(b, a, -(POINT_HIT_RADIUS - 2)))).toBe(bHit)
	})
})
