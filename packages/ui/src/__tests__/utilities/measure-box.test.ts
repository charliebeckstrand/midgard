import { afterEach, describe, expect, it } from 'vitest'
import { maxHeightIn } from '../../utilities/measure-box'

function capped(maxHeight: string) {
	const element = document.createElement('div')

	element.style.maxHeight = maxHeight

	document.body.append(element)

	return element
}

afterEach(() => {
	document.body.replaceChildren()
})

describe('maxHeightIn', () => {
	it('reads a px cap', () => {
		expect(maxHeightIn(capped('300px'), 800)).toBe(300)
	})

	it('reads a % cap as a share of the room', () => {
		expect(maxHeightIn(capped('85%'), 800)).toBe(680)
	})

	it('gives the room when the cap is taller than the room', () => {
		expect(maxHeightIn(capped('1200px'), 800)).toBe(800)
	})

	it('gives the room when there is no cap', () => {
		expect(maxHeightIn(capped('none'), 800)).toBe(800)
	})
})
