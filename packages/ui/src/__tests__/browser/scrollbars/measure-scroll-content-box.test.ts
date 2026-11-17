import { afterEach, describe, expect, it } from 'vitest'
import { measureScrollContentBox } from '../../../utilities/measure-box'

/**
 * A 300 by 200 px content box with a 10 px padding and a 2 px border, and a child that
 * overflows on the axes that `overflow` names.
 */
function scroller(gutter: string, overflow: { x: boolean; y: boolean }) {
	const element = document.createElement('div')

	Object.assign(element.style, {
		boxSizing: 'content-box',
		width: '300px',
		height: '200px',
		padding: '10px',
		border: '2px solid',
		overflow: 'auto',
		scrollbarGutter: gutter,
	})

	const child = document.createElement('div')

	Object.assign(child.style, {
		width: overflow.x ? '1000px' : '1px',
		height: overflow.y ? '1000px' : '1px',
	})

	element.append(child)

	document.body.append(element)

	return element
}

afterEach(() => {
	document.body.replaceChildren()
})

/**
 * The cases run with real scrollbars (the `scrollbars` instance of
 * `vitest.browser.config.ts`), so a scrollbar that shows takes space.
 */
describe('measureScrollContentBox (real browser, real scrollbars)', () => {
	const overflows = [
		{ x: false, y: false },
		{ x: true, y: false },
		{ x: false, y: true },
		{ x: true, y: true },
	]

	it('ignores the scrollbars that the overflow adds', () => {
		for (const overflow of overflows) {
			expect(measureScrollContentBox(scroller('auto', overflow))).toEqual({
				width: 300,
				height: 200,
			})
		}
	})

	it('subtracts a reserved gutter, with or without an overflow', () => {
		const reference = scroller('stable', { x: false, y: false })

		// The gutter is the width of a real scrollbar, so the case reads it from the page.
		const gutter = reference.offsetWidth - 4 - reference.clientWidth

		expect(gutter).toBeGreaterThan(0)

		for (const overflow of overflows) {
			expect(measureScrollContentBox(scroller('stable', overflow))).toEqual({
				width: 300 - gutter,
				height: 200,
			})
		}
	})
})
