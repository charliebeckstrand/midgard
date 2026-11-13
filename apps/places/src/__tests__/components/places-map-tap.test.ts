import { describe, expect, it } from 'vitest'
import { isSingleTap } from '../../components/places-map/places-map-utilities'

// On a phone, the map drills into a region only on a double tap. One tap on a
// region opens nothing, so that a stray tap while the reader pans does not
// drill into one. A place or a trip opens on one tap and takes no gate.
describe('isSingleTap', () => {
	it('holds back one tap of a finger', () => {
		expect(isSingleTap({ pointerType: 'touch', count: 1 })).toBe(true)
	})

	it('lets the second tap of a double tap open', () => {
		expect(isSingleTap({ pointerType: 'touch', count: 2 })).toBe(false)
	})

	it('lets a click, a pen, and a key open', () => {
		expect(isSingleTap({ pointerType: 'mouse', count: 1 })).toBe(false)

		expect(isSingleTap({ pointerType: 'pen', count: 1 })).toBe(false)

		expect(isSingleTap({ pointerType: 'keyboard', count: 1 })).toBe(false)
	})
})
