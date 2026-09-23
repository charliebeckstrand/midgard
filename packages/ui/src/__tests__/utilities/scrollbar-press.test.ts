import { describe, expect, it } from 'vitest'
import { isScrollbarPress } from '../../utilities/scrollbar-press'

type Geometry = {
	direction?: 'ltr' | 'rtl'
	borderLeft?: number
	borderRight?: number
	gutter?: number
}

/**
 * A detached scroller that overflows on the vertical axis only. The box is 200px wide, and the
 * geometry reads come from stubs, because jsdom does no layout.
 */
function scroller({ direction = 'ltr', borderLeft = 0, borderRight = 0, gutter = 0 }: Geometry) {
	const element = document.createElement('div')

	element.style.overflowY = 'auto'
	element.style.direction = direction
	element.style.borderLeft = `${borderLeft}px solid`
	element.style.borderRight = `${borderRight}px solid`

	const clientWidth = 200 - borderLeft - borderRight - gutter

	const geometry = {
		offsetWidth: 200,
		clientWidth,
		scrollWidth: clientWidth,
		clientHeight: 100,
		scrollHeight: 400,
	}

	for (const [key, value] of Object.entries(geometry)) {
		Object.defineProperty(element, key, { configurable: true, value })
	}

	return element
}

const press = (offsetX: number, offsetY = 50) => ({ offsetX, offsetY })

describe('isScrollbarPress', () => {
	it('reads a press past the client width as a gutter press under ltr', () => {
		const target = scroller({ borderLeft: 7, borderRight: 3, gutter: 15 })

		expect(isScrollbarPress(press(180), target)).toBe(true)

		expect(isScrollbarPress(press(170), target)).toBe(false)
	})

	it('includes the boundary pixel at the ltr gutter edge', () => {
		const target = scroller({ gutter: 15 })

		// The client width is 185, so the gutter starts at offset 185.
		expect(isScrollbarPress(press(185), target)).toBe(true)

		expect(isScrollbarPress(press(184), target)).toBe(false)
	})

	it('measures the ltr gutter from the inner border edge of a bordered box', () => {
		const target = scroller({ borderLeft: 7, borderRight: 3, gutter: 15 })

		// The left border is not in the offset. The gutter starts at the client width, 175.
		expect(isScrollbarPress(press(175), target)).toBe(true)

		expect(isScrollbarPress(press(174.5), target)).toBe(false)
	})

	it('reads a press inside the inline-start gutter as a gutter press under rtl', () => {
		const target = scroller({ direction: 'rtl', borderLeft: 7, borderRight: 3, gutter: 15 })

		expect(isScrollbarPress(press(0), target)).toBe(true)

		expect(isScrollbarPress(press(14.5), target)).toBe(true)
	})

	it('keeps the border widths out of the rtl gutter', () => {
		const target = scroller({ direction: 'rtl', borderLeft: 7, borderRight: 3, gutter: 15 })

		// Offsets 15 to 25 are content. The old arithmetic counted both borders as gutter.
		expect(isScrollbarPress(press(16), target)).toBe(false)

		expect(isScrollbarPress(press(24), target)).toBe(false)
	})

	it('excludes the boundary pixel at the rtl gutter edge', () => {
		const target = scroller({ direction: 'rtl', gutter: 15 })

		expect(isScrollbarPress(press(15), target)).toBe(false)
	})

	it('reports no rtl gutter press on a bordered scroller whose scrollbar takes no width', () => {
		const target = scroller({ direction: 'rtl', borderLeft: 7, borderRight: 3 })

		expect(isScrollbarPress(press(3), target)).toBe(false)
	})

	it('includes the boundary pixel at the horizontal gutter edge', () => {
		const target = scroller({})

		target.style.overflowX = 'auto'

		Object.defineProperty(target, 'scrollWidth', { configurable: true, value: 800 })

		// The client height is 100, so the horizontal gutter starts at offset 100.
		expect(isScrollbarPress(press(50, 100), target)).toBe(true)

		expect(isScrollbarPress(press(50, 99), target)).toBe(false)
	})

	it('reports no press on an axis that cannot scroll', () => {
		const target = scroller({ direction: 'rtl', borderLeft: 7, borderRight: 3, gutter: 15 })

		Object.defineProperty(target, 'scrollHeight', { configurable: true, value: 100 })

		expect(isScrollbarPress(press(0), target)).toBe(false)
	})
})
