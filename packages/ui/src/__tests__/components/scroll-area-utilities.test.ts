import { describe, expect, it } from 'vitest'
import { HIDDEN_THUMB, MIN_THUMB_SIZE } from '../../components/scroll-area/scroll-area-constants'
import {
	computeThumb,
	findScrollableAncestor,
} from '../../components/scroll-area/scroll-area-utilities'

describe('computeThumb', () => {
	it('returns HIDDEN_THUMB when content fits the viewport', () => {
		expect(computeThumb(0, 100, 80, 100)).toBe(HIDDEN_THUMB)
	})

	it('returns HIDDEN_THUMB when trackSize is 0', () => {
		expect(computeThumb(0, 100, 400, 0)).toBe(HIDDEN_THUMB)
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

describe('findScrollableAncestor', () => {
	function makeAncestor(overflow: string, scrollHeight: number, clientHeight = 100) {
		const el = document.createElement('div')

		Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
		Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
		Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 0 })
		Object.defineProperty(el, 'clientWidth', { configurable: true, value: 0 })

		el.style.overflowY = overflow

		return el
	}

	it('returns null when start is null', () => {
		expect(findScrollableAncestor(null)).toBeNull()
	})

	it('returns null when no ancestor is scrollable', () => {
		const parent = document.createElement('div')
		const child = document.createElement('div')

		parent.appendChild(child)
		document.body.appendChild(parent)

		expect(findScrollableAncestor(child)).toBeNull()

		document.body.removeChild(parent)
	})

	it('returns the nearest ancestor whose overflow allows scrolling and content exceeds the viewport', () => {
		const scrollable = makeAncestor('auto', 400)

		const child = document.createElement('div')

		scrollable.appendChild(child)
		document.body.appendChild(scrollable)

		expect(findScrollableAncestor(child)).toBe(scrollable)

		document.body.removeChild(scrollable)
	})

	it('skips ancestors whose content does not exceed the viewport', () => {
		const tooSmall = makeAncestor('auto', 50)

		const child = document.createElement('div')

		tooSmall.appendChild(child)
		document.body.appendChild(tooSmall)

		expect(findScrollableAncestor(child)).toBeNull()

		document.body.removeChild(tooSmall)
	})
})
