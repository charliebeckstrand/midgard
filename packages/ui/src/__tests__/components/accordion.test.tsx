import { describe, expect, it, vi } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
	useAccordionItem,
} from '../../components/accordion'
import type { Mount } from '../../primitives/mount'
import { act, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('AccordionTrigger', () => {
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

	it('only references the panel via aria-controls while it is mounted', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const trigger = screen.getByRole('button', { name: 'Toggle' })

		// Closed: the panel is unmounted, so the reference would dangle.
		expect(trigger).not.toHaveAttribute('aria-controls')

		fireEvent.click(trigger)

		const controls = trigger.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).toBe(screen.getByRole('region'))
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

describe('useAccordionItem in trigger children', () => {
	function OpenLabel() {
		const { open } = useAccordionItem()

		return open ? 'Open!' : 'Closed'
	}

	it('exposes open=true to trigger children', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionTrigger>
						<OpenLabel />
					</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText('Open!')).toBeInTheDocument()
	})

	it('exposes open=false when the item is closed', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>
						<OpenLabel />
					</AccordionTrigger>
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
		const user = userEvent.setup({ delay: null })

		renderAccordion()

		act(() => trigger('First').focus())

		await user.keyboard('{ArrowDown}')

		expect(trigger('Third')).toHaveFocus()

		await user.keyboard('{ArrowUp}')

		expect(trigger('First')).toHaveFocus()
	})
})

describe('Accordion mount policy', () => {
	function Panels({ mount }: { mount?: Mount }) {
		return (
			<Accordion type="single" collapsible mount={mount}>
				<AccordionItem value="a">
					<AccordionTrigger>First</AccordionTrigger>
					<AccordionPanel>
						<input data-testid="field" defaultValue="" />
					</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>Second</AccordionTrigger>
					<AccordionPanel>Second body</AccordionPanel>
				</AccordionItem>
			</Accordion>
		)
	}

	it('unmounts a closed panel by default, losing its state', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(<Panels />)

		await user.click(screen.getByText('First'))

		await user.type(screen.getByTestId('field'), 'typed')

		await user.click(screen.getByText('First'))

		expect(screen.queryByTestId('field')).not.toBeInTheDocument()
	})

	it('mount="lazy" holds an opened panel and its state across a close', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(<Panels mount="lazy" />)

		// Never opened, so never mounted.
		expect(screen.queryByText('Second body')).not.toBeInTheDocument()

		await user.click(screen.getByText('First'))

		await user.type(screen.getByTestId('field'), 'typed')

		await user.click(screen.getByText('First'))

		expect(screen.getByTestId('field')).not.toBeVisible()

		await user.click(screen.getByText('First'))

		expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('typed')
	})

	it('mount="always" mounts every panel closed and hidden', () => {
		renderUI(<Panels mount="always" />)

		expect(screen.getByText('Second body')).toBeInTheDocument()

		expect(screen.getByText('Second body')).not.toBeVisible()
	})
})

/*
 * Driven on the held branch, for the reason the Collapse and Sheet suites record: the
 * motion mock resolves a landing only when the `animate` target changes between renders,
 * so a `mount="active"` panel — which enters by mounting — never resolves one.
 */
describe('Accordion onOpenComplete', () => {
	const accordion = (props: { value: string; onOpenComplete: (value: string) => void }) => (
		<Accordion
			type="single"
			mount="always"
			value={props.value}
			onValueChange={() => {}}
			onOpenComplete={props.onOpenComplete}
		>
			<AccordionItem value="one">
				<AccordionTrigger>One</AccordionTrigger>
				<AccordionPanel>First</AccordionPanel>
			</AccordionItem>
			<AccordionItem value="two">
				<AccordionTrigger>Two</AccordionTrigger>
				<AccordionPanel>Second</AccordionPanel>
			</AccordionItem>
		</Accordion>
	)

	it('names the section that landed', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(accordion({ value: '', onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()

		rerender(accordion({ value: 'two', onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledExactlyOnceWith('two')
	})

	it('reports only the section that opened on a single-type swap', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(accordion({ value: 'one', onOpenComplete }))

		rerender(accordion({ value: 'two', onOpenComplete }))

		// 'one' closes in the same pass, and its exit lands on the same handler; the
		// definition gate keeps it out.
		expect(onOpenComplete).toHaveBeenCalledExactlyOnceWith('two')
	})

	it('says nothing for a section that mounts already open', () => {
		const onOpenComplete = vi.fn()

		renderUI(accordion({ value: 'one', onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()
	})
})
