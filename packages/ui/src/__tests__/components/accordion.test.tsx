import { describe, expect, it, vi } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../components/accordion'
import { act, bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('Accordion', () => {
	it('renders with data-slot="accordion"', () => {
		const { container } = renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
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
					<AccordionTrigger>Toggle</AccordionTrigger>
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
					<AccordionTrigger>Toggle</AccordionTrigger>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion-item')).toBeInTheDocument()
	})
})

describe('AccordionTrigger', () => {
	it('renders with data-slot="accordion-trigger"', () => {
		const { container } = renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion-trigger')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle Me</AccordionTrigger>
					<AccordionPanel>Content</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Toggle Me')).toBeInTheDocument()
	})

	it('fires a consumer onClick alongside the toggle', () => {
		const onClick = vi.fn()

		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger onClick={onClick}>Toggle</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('Toggle'))

		// The consumer handler must not clobber the panel toggle, and vice versa.
		expect(onClick).toHaveBeenCalledTimes(1)

		expect(screen.getByText('Panel A')).toBeInTheDocument()
	})
})

describe('AccordionPanel', () => {
	it('renders panel content when open', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
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
					<AccordionTrigger>Open A</AccordionTrigger>
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
					<AccordionTrigger>Toggle A</AccordionTrigger>
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
					<AccordionTrigger>Toggle A</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>B</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>B</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>B</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
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
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>B</AccordionTrigger>
					<AccordionPanel>Panel B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Panel A')).toBeInTheDocument()

		expect(screen.getByText('Panel B')).toBeInTheDocument()
	})
})

describe('AccordionTrigger render-prop child', () => {
	it('invokes a function child with the current open state', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionTrigger>{({ open }) => (open ? 'Open!' : 'Closed')}</AccordionTrigger>
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
					<AccordionTrigger>{({ open }) => (open ? 'Open!' : 'Closed')}</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Closed')).toBeInTheDocument()
	})
})

describe('Accordion keyboard navigation', () => {
	const trigger = (name: string) => screen.getByRole('button', { name })

	function renderAccordion() {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>First</AccordionTrigger>
					<AccordionPanel>A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b" disabled>
					<AccordionTrigger>Second</AccordionTrigger>
					<AccordionPanel>B</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="c">
					<AccordionTrigger>Third</AccordionTrigger>
					<AccordionPanel>C</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)
	}

	it('moves focus between headers with arrows, skipping the disabled trigger', async () => {
		const user = userEvent.setup()

		renderAccordion()

		act(() => trigger('First').focus())

		await user.keyboard('{ArrowDown}')

		expect(trigger('Third')).toHaveFocus()

		await user.keyboard('{ArrowUp}')

		expect(trigger('First')).toHaveFocus()
	})
})
