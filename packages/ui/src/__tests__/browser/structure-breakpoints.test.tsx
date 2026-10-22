import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Box } from '../../structure/box'
import { Flex } from '../../structure/flex'
import { getSlot, renderUI } from '../helpers'

/** A length of the computed style of the element, in pixels. */
function length(element: Element, property: 'columnGap' | 'paddingTop'): number {
	return Number.parseFloat(getComputedStyle(element)[property])
}

const flex = () =>
	getSlot(renderUI(<Flex gap={{ initial: 0, md: 'lg' }}>content</Flex>).container, 'flex')

const box = () =>
	getSlot(renderUI(<Box p={{ initial: 0, md: 'lg' }}>content</Box>).container, 'box')

/**
 * A breakpoint of a structure unit replaces the value of a smaller one. The `0`
 * step of the spacing scale was a plain utility, and it outranks the `density`
 * layer of the other steps, so `{ initial: 0, md: 'lg' }` kept no space at `md`.
 */
describe('the 0 step below the breakpoint (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	it('gives no space', () => {
		expect(length(flex(), 'columnGap')).toBe(0)

		expect(length(box(), 'paddingTop')).toBe(0)
	})
})

describe('the 0 step from the breakpoint (real browser)', () => {
	beforeAll(() => page.viewport(1024, 768))

	it('gives the space of the breakpoint', () => {
		expect(length(flex(), 'columnGap')).toBeGreaterThan(0)

		expect(length(box(), 'paddingTop')).toBeGreaterThan(0)
	})
})
