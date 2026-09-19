// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { hiddenThumb, MIN_THUMB_SIZE } from '../../components/scroll-area/scroll-area-constants'
import { computeThumb } from '../../components/scroll-area/scroll-area-utilities'

/**
 * `computeThumb` takes four numbers and returns a thumb. It reads no element,
 * so it wants no window: it ran under jsdom only because it shared a file with
 * `findScrollableAncestor`, which does read elements and now has its own home
 * in the browser suite.
 */

describe('computeThumb', () => {
	it('returns hiddenThumb when content fits the viewport', () => {
		expect(computeThumb(0, 100, 80, 100)).toBe(hiddenThumb)
	})

	it('returns hiddenThumb when trackSize is 0', () => {
		expect(computeThumb(0, 100, 400, 0)).toBe(hiddenThumb)
	})

	it('sizes the thumb proportional to the viewport / content ratio', () => {
		// 100 / 400 = 0.25 * 100 = 25 (above MIN_THUMB_SIZE)
		const thumb = computeThumb(0, 100, 400, 100)

		expect(thumb.size).toBe(25)

		expect(thumb.offset).toBe(0)

		expect(thumb.visible).toBe(true)
	})

	it('clamps the thumb to MIN_THUMB_SIZE when the raw size is smaller', () => {
		const thumb = computeThumb(0, 100, 2000, 100)

		expect(thumb.size).toBe(MIN_THUMB_SIZE)
	})

	it('positions the thumb proportionally to the scroll position', () => {
		// content=400, viewport=100, track=100 → thumb size=25, maxOffset=75
		// scrollPos=150 of maxScroll=300 → ratio=0.5 → offset=37.5
		const thumb = computeThumb(150, 100, 400, 100)

		expect(thumb.offset).toBe(37.5)
	})
})
