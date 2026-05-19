import { describe, expect, it, vi } from 'vitest'
import {
	Accordion,
	AccordionButton,
	AccordionItem,
	AccordionPanel,
} from '../../components/accordion'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

describe('Accordion single-select behavior', () => {
	it('opens an item when its button is clicked', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>Open A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('Open A'))

		expect(screen.getByText('Panel A')).toBeInTheDocument()
	})

	it('collapses a single-mode item when clicked again with collapsible defaulting to true', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion defaultValue="a" onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>Toggle A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('Toggle A'))

		expect(onValueChange).toHaveBeenCalledWith(null)
	})

	it('keeps an item open when collapsible is false', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion defaultValue="a" collapsible={false} onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>Toggle A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('Toggle A'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('switches the open item when a different button is clicked', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion defaultValue="a" onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionButton>B</AccordionButton>
					<AccordionPanel>Panel B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('B'))

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('supports controlled value', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion value="a" onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Panel A')).toBeInTheDocument()
	})

	it('supports a controlled null value (closed)', () => {
		renderUI(
			<Accordion value={null}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.queryByText('Panel A')).not.toBeInTheDocument()
	})
})

describe('Accordion multiple-select behavior', () => {
	it('opens multiple items at once', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion type="multiple" defaultValue={['a']} onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionButton>B</AccordionButton>
					<AccordionPanel>Panel B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Panel A')).toBeInTheDocument()

		fireEvent.click(screen.getByText('B'))

		expect(onValueChange).toHaveBeenCalledWith(['a', 'b'])
	})

	it('closes one of many open items when its button is clicked', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Accordion type="multiple" defaultValue={['a', 'b']} onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionButton>B</AccordionButton>
					<AccordionPanel>Panel B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('A'))

		expect(onValueChange).toHaveBeenCalledWith(['b'])
	})

	it('treats a multi-select value of undefined defaultValue as empty', () => {
		renderUI(
			<Accordion type="multiple">
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.queryByText('Panel A')).not.toBeInTheDocument()
	})

	it('supports a controlled multi-select value', () => {
		renderUI(
			<Accordion type="multiple" value={['a', 'b']}>
				<AccordionItem value="a">
					<AccordionButton>A</AccordionButton>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionButton>B</AccordionButton>
					<AccordionPanel>Panel B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Panel A')).toBeInTheDocument()

		expect(screen.getByText('Panel B')).toBeInTheDocument()
	})
})

describe('AccordionButton render-prop child', () => {
	it('invokes a function child with the current open state', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionButton>{({ open }) => (open ? 'Open!' : 'Closed')}</AccordionButton>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Open!')).toBeInTheDocument()
	})

	it('invokes a function child with open=false when the item is closed', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionButton>{({ open }) => (open ? 'Open!' : 'Closed')}</AccordionButton>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Closed')).toBeInTheDocument()
	})
})
