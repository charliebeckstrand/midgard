import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Box } from '../../structure/box'
import { Columns, ColumnsItem } from '../../structure/columns'
import { Flex } from '../../structure/flex'
import { getSlot, present, renderUI } from '../helpers'

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

/** The rendered width of an element, in pixels. */
function width(element: Element): number {
	return element.getBoundingClientRect().width
}

/**
 * A grid of two columns from `md`, with a cell that spans the row below `md`
 * and one column from it, and a cell that spans the row at each width.
 */
const spans = () => {
	const { container } = renderUI(
		<Columns columns={{ initial: 1, md: 2 }} gap={0}>
			<ColumnsItem data-testid="narrows" span={{ initial: 'full', md: 1 }}>
				a
			</ColumnsItem>
			<ColumnsItem data-testid="full" span="full">
				b
			</ColumnsItem>
		</Columns>,
	)

	const grid = getSlot(container, 'columns')

	const cell = (id: string) =>
		present(container.querySelector(`[data-testid="${id}"]`), `[data-testid="${id}"]`)

	return { grid, narrows: cell('narrows'), full: cell('full') }
}

describe('the span of a ColumnsItem below the breakpoint (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	it('spans the row', () => {
		const { grid, narrows, full } = spans()

		expect(width(narrows)).toBeCloseTo(width(grid), 0)

		expect(width(full)).toBeCloseTo(width(grid), 0)
	})
})

describe('the span of a ColumnsItem from the breakpoint (real browser)', () => {
	beforeAll(() => page.viewport(1024, 768))

	it('takes the span of the breakpoint', () => {
		const { grid, narrows, full } = spans()

		expect(width(narrows)).toBeCloseTo(width(grid) / 2, 0)

		expect(width(full)).toBeCloseTo(width(grid), 0)
	})
})
