import { Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Group } from '../../../components/group'
import { Input } from '../../../components/input'
import { getAllSlots, renderUI } from '../../helpers'

/** The four corner radii, in the order top-left, top-right, bottom-right, bottom-left. */
function corners(element: HTMLElement): string[] {
	const style = getComputedStyle(element)

	return [
		style.borderTopLeftRadius,
		style.borderTopRightRadius,
		style.borderBottomRightRadius,
		style.borderBottomLeftRadius,
	]
}

const round = '8px'

const flat = '0px'

/**
 * A Group joins its children by their DOM position. A child that is not the
 * first has a flat start side, and a child that is not the last has a flat end
 * side. The classes reach the `ControlFrame` in a control, because the frame
 * holds the border.
 *
 * Rides the real browser because the claim is a computed one: jsdom computes
 * no styles from the Tailwind classes.
 */
describe('Group joins (real browser)', () => {
	it('flattens the inner corners of a row, and overlaps the borders by 1 px', () => {
		const { container } = renderUI(
			<Group>
				<Button>A</Button>
				<Button>B</Button>
				<Button>C</Button>
			</Group>,
		)

		const [start, middle, end] = getAllSlots(container, 'button')

		expect(corners(start as HTMLElement)).toEqual([round, flat, flat, round])

		expect(corners(middle as HTMLElement)).toEqual([flat, flat, flat, flat])

		expect(corners(end as HTMLElement)).toEqual([flat, round, round, flat])

		const [a, b] = [start, middle].map((button) => (button as HTMLElement).getBoundingClientRect())

		expect(b?.left).toBe((a?.right ?? 0) - 1)
	})

	it('flattens the inner corners of a column', () => {
		const { container } = renderUI(
			<Group orientation="vertical">
				<Button>A</Button>
				<Button>B</Button>
			</Group>,
		)

		const [start, end] = getAllSlots(container, 'button')

		expect(corners(start as HTMLElement)).toEqual([round, round, flat, flat])

		expect(corners(end as HTMLElement)).toEqual([flat, flat, round, round])
	})

	it('reaches the frame that a control wraps', () => {
		const { container } = renderUI(
			<Group>
				<Input aria-label="Amount" />
				<Button>Go</Button>
			</Group>,
		)

		const [frame] = getAllSlots(container, 'control-frame')

		expect(corners(frame as HTMLElement)).toEqual([round, flat, flat, round])
	})

	it('joins the children of a Fragment as siblings', () => {
		const { container } = renderUI(
			<Group>
				<Fragment key="pair">
					<Button>A</Button>
					<Button>B</Button>
				</Fragment>
				<Button>C</Button>
			</Group>,
		)

		const [, middle] = getAllSlots(container, 'button')

		expect(corners(middle as HTMLElement)).toEqual([flat, flat, flat, flat])
	})

	it('gives no position to a child that renders nothing', () => {
		function Nothing() {
			return null
		}

		const { container } = renderUI(
			<Group>
				<Button>A</Button>
				<Button>B</Button>
				<Nothing />
			</Group>,
		)

		const [, end] = getAllSlots(container, 'button')

		expect(corners(end as HTMLElement)).toEqual([flat, round, round, flat])
	})

	it('flattens the shared side of an inner group', () => {
		const { container } = renderUI(
			<Group>
				<Group orientation="vertical">
					<Input aria-label="From" />
					<Input aria-label="To" />
				</Group>
				<Button>Go</Button>
			</Group>,
		)

		const [top, bottom] = getAllSlots(container, 'control-frame')

		expect(corners(top as HTMLElement)).toEqual([round, flat, flat, flat])

		expect(corners(bottom as HTMLElement)).toEqual([flat, flat, flat, round])
	})
})
