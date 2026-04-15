import { describe, expect, it } from 'vitest'
import {
	Accordion,
	AccordionButton,
	AccordionItem,
	AccordionPanel,
} from '../../components/accordion'
import { bySlot, renderUI, screen } from '../helpers'

describe('Accordion', () => {
	it('renders with data-slot="accordion"', () => {
		const { container } = renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>Toggle</AccordionButton>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const el = bySlot(container, 'accordion')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Accordion className="custom">
				<AccordionItem value="a">
					<AccordionButton>Toggle</AccordionButton>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const el = bySlot(container, 'accordion')

		expect(el?.className).toContain('custom')
	})
})

describe('AccordionItem', () => {
	it('renders with data-slot="accordion-item"', () => {
		const { container } = renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>Toggle</AccordionButton>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion-item')).toBeInTheDocument()
	})
})

describe('AccordionButton', () => {
	it('renders with data-slot="accordion-button"', () => {
		const { container } = renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>Toggle</AccordionButton>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion-button')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>Toggle Me</AccordionButton>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Toggle Me')).toBeInTheDocument()
	})
})

describe('AccordionPanel', () => {
	it('renders panel content when open', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionButton>Toggle</AccordionButton>
					<AccordionPanel>Panel Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Panel Content')).toBeInTheDocument()
	})
})
