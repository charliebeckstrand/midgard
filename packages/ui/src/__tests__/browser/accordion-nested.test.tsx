import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../components/accordion'
import type { Mount } from '../../primitives/mount'
import { present, renderUI, screen } from '../helpers'

/**
 * An accordion in the panel of another accordion keeps its own state. Its closed
 * headers look closed, only the item of the focused header rings, and the arrow
 * keys of the outer accordion move past it.
 *
 * Rides the real browser for two reasons. jsdom loads no stylesheet, so it cannot
 * compute a look. And jsdom gives focus to a button that `display: none` hides,
 * which a browser does not.
 */
describe('a nested accordion (real browser)', () => {
	function Nested({ mount, open }: { mount?: Mount; open: boolean }) {
		return (
			<>
				<button type="button">Before</button>

				<Accordion type="multiple" mount={mount} defaultValue={open ? ['outer'] : []}>
					<AccordionItem value="outer">
						<AccordionTrigger>Outer first</AccordionTrigger>
						<AccordionPanel>
							<Accordion>
								<AccordionItem value="inner">
									<AccordionTrigger>Inner</AccordionTrigger>
									<AccordionPanel>Inner panel</AccordionPanel>
								</AccordionItem>
							</Accordion>
						</AccordionPanel>
					</AccordionItem>

					<AccordionItem value="next">
						<AccordionTrigger>Outer second</AccordionTrigger>
						<AccordionPanel>Next panel</AccordionPanel>
					</AccordionItem>
				</Accordion>
			</>
		)
	}

	const button = (name: string) => screen.getByRole('button', { name })

	/** The text color of a header button, and the rotation of its indicator. */
	function look(name: string) {
		const header = button(name)

		const indicator = present(header.querySelector('svg'), `${name} indicator`)

		return { color: getComputedStyle(header).color, rotate: getComputedStyle(indicator).rotate }
	}

	/** The box shadow of the item of a header, which carries its focus ring. */
	function ring(name: string) {
		const item = present(button(name).closest<HTMLElement>('[data-slot="accordion-item"]'), 'item')

		return getComputedStyle(item).boxShadow
	}

	it('gives a closed nested header the look of a closed header', () => {
		renderUI(<Nested open />)

		expect(look('Inner')).toEqual(look('Outer second'))

		// The open header keeps the open look, so the match above is not a match of two defaults.
		expect(look('Outer first')).not.toEqual(look('Outer second'))
	})

	it('rings only the item whose own header has keyboard focus', async () => {
		renderUI(<Nested open />)

		const rest = ring('Outer second')

		button('Before').focus()

		await userEvent.keyboard('{Tab}')

		expect(button('Outer first')).toHaveFocus()

		expect(ring('Outer first')).not.toBe(rest)

		await userEvent.keyboard('{Tab}')

		expect(button('Inner')).toHaveFocus()

		expect(ring('Inner')).not.toBe(rest)

		expect(ring('Outer first')).toBe(rest)
	})

	it('moves the arrow keys past a closed item that holds a nested accordion', async () => {
		// `always` keeps the closed panel in the DOM, hidden, with the nested headers in it.
		renderUI(<Nested mount="always" open={false} />)

		button('Outer first').focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(button('Outer second')).toHaveFocus()

		await userEvent.keyboard('{ArrowUp}')

		expect(button('Outer first')).toHaveFocus()
	})
})
