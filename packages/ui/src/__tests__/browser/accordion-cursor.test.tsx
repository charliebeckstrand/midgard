import { describe, expect, it } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../components/accordion'
import { present, renderUI } from '../helpers'

/**
 * The cursor over an accordion header.
 *
 * When the accordion is not collapsible, a press does not close the open section. Thus its
 * header shows the default cursor, not the pointer. A closed header opens on a press, so it
 * keeps the pointer. A disabled header shows `not-allowed`, also when it is open.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */

function render({ collapsible, disabled = false }: { collapsible: boolean; disabled?: boolean }) {
	const items = (
		<>
			<AccordionItem value="a" disabled={disabled}>
				<AccordionTrigger>Open</AccordionTrigger>
				<AccordionPanel>Body A</AccordionPanel>
			</AccordionItem>
			<AccordionItem value="b">
				<AccordionTrigger>Closed</AccordionTrigger>
				<AccordionPanel>Body B</AccordionPanel>
			</AccordionItem>
		</>
	)

	// The props type takes `collapsible` as the literal `true` or `false`, not as a boolean.
	const { container } = renderUI(
		collapsible ? (
			<Accordion defaultValue="a">{items}</Accordion>
		) : (
			<Accordion defaultValue="a" collapsible={false}>
				{items}
			</Accordion>
		),
	)

	const [open, closed] = container.querySelectorAll('[data-slot=accordion-trigger]')

	return {
		open: getComputedStyle(present(open, 'open trigger')).cursor,
		closed: getComputedStyle(present(closed, 'closed trigger')).cursor,
	}
}

describe('the cursor over an accordion header (real browser)', () => {
	it('shows the default cursor on the open header when the accordion is not collapsible', () => {
		const { open, closed } = render({ collapsible: false })

		expect(open).toBe('default')

		expect(closed).toBe('pointer')
	})

	it('keeps the pointer on the open header when the accordion is collapsible', () => {
		expect(render({ collapsible: true }).open).toBe('pointer')
	})

	it('shows not-allowed on an open header whose item is disabled', () => {
		expect(render({ collapsible: false, disabled: true }).open).toBe('not-allowed')
	})
})
