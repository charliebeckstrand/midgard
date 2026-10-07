import { createRef, type ReactElement, useEffect } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
	type AccordionTriggerProps,
} from '../../components/accordion'
import { useAccordionItem } from '../../components/accordion/context'
import type { Mount } from '../../primitives/mount'
import {
	act,
	allBySlot,
	attach,
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
} from '../helpers'

/** Renders `element` to server markup, and parses the markup into a node off the page. */
function serverMarkup(element: ReactElement) {
	const markup = document.createElement('div')

	markup.innerHTML = renderToString(element)

	return markup
}

/**
 * Hydrates the server markup of `element` in a node on the body.
 *
 * @returns Two spies. A node or a text mismatch reaches `onRecoverableError`,
 * and React logs an attribute mismatch to `consoleError`.
 */
function hydrate(element: ReactElement) {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToString(element)

	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	onTestFinished(() => consoleError.mockRestore())

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element, { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

	return { onRecoverableError, consoleError }
}

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

	// The toggle is the activation the trigger exists to perform, so a consumer
	// `preventDefault()` does not cancel it (CONVENTIONS.md §3.9).
	it('runs a consumer onClick first, and toggles when it prevents the default', () => {
		const calls: string[] = []

		renderUI(
			<Accordion onValueChange={() => calls.push('change')}>
				<AccordionItem value="a">
					<AccordionTrigger
						onClick={(event) => {
							calls.push('consumer')

							event.preventDefault()
						}}
					>
						Toggle
					</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.click(screen.getByText('Toggle'))

		expect(calls).toEqual(['consumer', 'change'])

		expect(screen.getByText('Panel A')).toBeInTheDocument()
	})

	// `data-slot` is admitted on JSX but not on a props object, so widen it.
	const triggered = (props: AccordionTriggerProps & { 'data-slot'?: string }) => (
		<Accordion>
			<AccordionItem value="a">
				<AccordionTrigger {...props}>Toggle</AccordionTrigger>
				<AccordionPanel>Panel A</AccordionPanel>
			</AccordionItem>
		</Accordion>
	)

	it('ignores a custom data-slot', () => {
		// Accordion's roving itemSelector reads this anchor, so a rename must not
		// drop the header out of the item set (§3.9).
		const { container } = renderUI(triggered({ 'data-slot': 'renamed' }))

		expect(bySlot(container, 'accordion-trigger')).toBeInTheDocument()

		expect(bySlot(container, 'renamed')).toBeNull()
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

	it('keeps the panels out of the landmarks with region={false}, and keeps aria-controls', () => {
		renderUI(
			<Accordion region={false}>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const trigger = screen.getByRole('button', { name: 'Toggle' })

		fireEvent.click(trigger)

		expect(screen.queryByRole('region')).not.toBeInTheDocument()

		const panel = bySlot(document.body, 'accordion-panel')

		expect(panel).not.toHaveAttribute('aria-labelledby')

		expect(trigger).toHaveAttribute('aria-controls', panel?.id)
	})

	it('keeps type="button" when a consumer supplies a type', () => {
		renderUI(triggered({ type: 'submit' }))

		// §3.9: a stray `type` must not turn a header into a submit button for the
		// form that encloses the accordion.
		expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('type', 'button')
	})

	it('takes no disabled of its own, because the item owns it', () => {
		renderUI(
			<Accordion>
				<AccordionItem value="a">
					{/* @ts-expect-error: the item owns `disabled` */}
					<AccordionTrigger disabled>Toggle</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		// A JavaScript caller can still pass it, and the state of the item wins.
		expect(screen.getByRole('button', { name: 'Toggle' })).toBeEnabled()
	})

	// Roving is a keyboard model that no consumer switches off (CONVENTIONS.md §3.9).
	it('keeps the arrow keys when a consumer onKeyDown prevents the default', async () => {
		const user = setupUser()

		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger onKeyDown={(event) => event.preventDefault()}>First</AccordionTrigger>
					<AccordionPanel>A</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>Second</AccordionTrigger>
					<AccordionPanel>B</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		act(() => screen.getByRole('button', { name: 'First' }).focus())

		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()
	})

	it('marks the open header aria-disabled while its section cannot close', () => {
		renderUI(
			<Accordion defaultValue="a" collapsible={false}>
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

		const a = screen.getByRole('button', { name: 'A' })

		const b = screen.getByRole('button', { name: 'B' })

		// The WAI-ARIA accordion pattern: a header whose panel cannot collapse is
		// aria-disabled. The header stays in the Tab sequence.
		expect(a).toHaveAttribute('aria-disabled', 'true')

		expect(a).toBeEnabled()

		expect(b).not.toHaveAttribute('aria-disabled')

		fireEvent.click(b)

		expect(a).not.toHaveAttribute('aria-disabled')

		expect(b).toHaveAttribute('aria-disabled', 'true')
	})

	it('leaves aria-disabled off the open header of a collapsible accordion', () => {
		renderUI(
			<Accordion defaultValue="a">
				<AccordionItem value="a">
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByRole('button', { name: 'A' })).not.toHaveAttribute('aria-disabled')
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

	it('keeps each toggle of one batch', () => {
		const onValueChange = vi.fn()

		const toggles = new Map<string, () => void>()

		function Grab() {
			const { value, toggle } = useAccordionItem()

			useEffect(() => {
				toggles.set(value, toggle)
			}, [value, toggle])

			return null
		}

		renderUI(
			<Accordion type="multiple" onValueChange={onValueChange}>
				<AccordionItem value="a">
					<AccordionTrigger>A</AccordionTrigger>
					<AccordionPanel>Panel A</AccordionPanel>
					<Grab />
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>B</AccordionTrigger>
					<AccordionPanel>Panel B</AccordionPanel>
					<Grab />
				</AccordionItem>
			</Accordion>,
		)

		// The second toggle of the batch starts from the first.
		act(() => {
			toggles.get('a')?.()

			toggles.get('b')?.()
		})

		expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b'])

		expect(screen.getByText('Panel A')).toBeInTheDocument()

		expect(screen.getByText('Panel B')).toBeInTheDocument()
	})

	it('starts a toggle from the committed set after a controlled owner refuses one', () => {
		const onValueChange = vi.fn()

		// One identity across renders, so a refused toggle leaves the value unchanged.
		const none: string[] = []

		renderUI(
			<Accordion type="multiple" value={none} onValueChange={onValueChange}>
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

		fireEvent.click(screen.getByRole('button', { name: 'A' }))

		fireEvent.click(screen.getByRole('button', { name: 'B' }))

		expect(onValueChange).toHaveBeenLastCalledWith(['b'])
	})
})

describe('useAccordionItem in trigger children', () => {
	function OpenLabel() {
		const { open } = useAccordionItem()

		return open ? 'Open!' : 'Closed'
	}

	it.each([
		['open=true to trigger children', 'a', 'Open!'],
		['open=false when the item is closed', undefined, 'Closed'],
	])('exposes %s', (_, defaultValue, label) => {
		renderUI(
			<Accordion defaultValue={defaultValue}>
				<AccordionItem value="a">
					<AccordionTrigger>
						<OpenLabel />
					</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(screen.getByText(label)).toBeInTheDocument()
	})

	it('gives a custom header aria-controls only while its panel is in the DOM', () => {
		function CustomHeader() {
			const { toggle, triggerProps } = useAccordionItem()

			return (
				<button type="button" {...triggerProps} onClick={toggle}>
					Custom
				</button>
			)
		}

		renderUI(
			<Accordion>
				<AccordionItem value="a">
					<CustomHeader />
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const header = screen.getByRole('button', { name: 'Custom' })

		// Closed: the panel is unmounted, so the reference would dangle.
		expect(header).not.toHaveAttribute('aria-controls')

		fireEvent.click(header)

		expect(document.getElementById(header.getAttribute('aria-controls') ?? '')).toBe(
			bySlot(document.body, 'accordion-panel'),
		)
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
		const user = setupUser()

		renderAccordion()

		act(() => trigger('First').focus())

		await user.keyboard('{ArrowDown}')

		expect(trigger('Third')).toHaveFocus()

		await user.keyboard('{ArrowUp}')

		expect(trigger('First')).toHaveFocus()
	})

	it('keeps every enabled header in the Tab sequence', async () => {
		const user = setupUser()

		renderAccordion()

		act(() => trigger('First').focus())

		// The WAI-ARIA accordion pattern makes each header a Tab stop.
		await user.tab()

		expect(trigger('Third')).toHaveFocus()

		await user.keyboard('{ArrowUp}')

		// An arrow press moves focus, but seats no single Tab stop.
		expect(trigger('First')).toHaveFocus()

		expect(trigger('Third').tabIndex).toBe(0)
	})

	it('keeps the headers of a nested accordion out of the arrow keys of the outer one', async () => {
		const user = setupUser()

		renderUI(
			<Accordion type="multiple" defaultValue={['outer']}>
				<AccordionItem value="outer">
					<AccordionTrigger>Outer first</AccordionTrigger>
					<AccordionPanel>
						<Accordion>
							<AccordionItem value="inner-a">
								<AccordionTrigger>Inner first</AccordionTrigger>
								<AccordionPanel>A</AccordionPanel>
							</AccordionItem>
							<AccordionItem value="inner-b">
								<AccordionTrigger>Inner second</AccordionTrigger>
								<AccordionPanel>B</AccordionPanel>
							</AccordionItem>
						</Accordion>
					</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="next">
					<AccordionTrigger>Outer second</AccordionTrigger>
					<AccordionPanel>C</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		act(() => trigger('Outer first').focus())

		await user.keyboard('{ArrowDown}')

		expect(trigger('Outer second')).toHaveFocus()

		await user.keyboard('{End}')

		expect(trigger('Outer second')).toHaveFocus()

		// The nested accordion moves between its own headers.
		act(() => trigger('Inner first').focus())

		await user.keyboard('{ArrowDown}')

		expect(trigger('Inner second')).toHaveFocus()
	})
})

describe('Accordion mount policy', () => {
	function Panels({ mount, defaultValue }: { mount?: Mount; defaultValue?: string }) {
		return (
			<Accordion type="single" collapsible mount={mount} defaultValue={defaultValue}>
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
		const user = setupUser()

		renderUI(<Panels />)

		await user.click(screen.getByText('First'))

		await user.type(screen.getByTestId('field'), 'typed')

		await user.click(screen.getByText('First'))

		expect(screen.queryByTestId('field')).not.toBeInTheDocument()
	})

	it('mount="lazy" holds an opened panel and its state across a close', async () => {
		const user = setupUser()

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

	it('mount="always" references each closed panel via aria-controls', () => {
		renderUI(<Panels mount="always" />)

		// Every panel is present, so each closed header can point at its panel.
		const controls = screen.getByRole('button', { name: 'Second' }).getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).toContainElement(
			screen.getByText('Second body'),
		)
	})

	// The server renders nothing for a hidden Activity, so a closed panel is not
	// in the server markup. Only the open header can point at its panel there.
	it('mount="always" keeps aria-controls out of the server markup of a closed header', () => {
		const markup = serverMarkup(<Panels mount="always" defaultValue="a" />)

		const headers = allBySlot(markup, 'accordion-trigger')

		expect(headers).toHaveLength(2)

		expect(allBySlot(markup, 'accordion-panel')).toHaveLength(1)

		expect(headers[0]).toHaveAttribute('aria-controls', getSlot(markup, 'accordion-panel').id)

		expect(headers[1]).not.toHaveAttribute('aria-controls')
	})

	it('mount="always" hydrates with no mismatch, then references each closed panel', () => {
		const { onRecoverableError, consoleError } = hydrate(<Panels mount="always" />)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		const controls = screen.getByRole('button', { name: 'Second' }).getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).toContainElement(
			screen.getByText('Second body'),
		)
	})

	it('mount="lazy" drops aria-controls from a closed header', async () => {
		const user = setupUser()

		renderUI(<Panels mount="lazy" />)

		const first = screen.getByRole('button', { name: 'First' })

		await user.click(first)

		await user.click(first)

		// The held panel stays in the DOM, but `lazy` gives no presence guarantee.
		expect(first).not.toHaveAttribute('aria-controls')
	})
})

// Held branch, for the reason the Collapse suite records.
describe('Accordion onOpenComplete', () => {
	const accordion = (props: { value: string; onOpenComplete: (value: string) => void }) => (
		<Accordion type="single" mount="always" onValueChange={() => {}} {...props}>
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

describe('structure roots pass native props through', () => {
	// Eight structure roots were closed prop bags while six siblings spread. One
	// test covers them all, because the rule is one rule: a root takes native
	// attributes and a `ref`, and its own resolved wiring still wins.
	it('spreads a consumer id and data attribute onto the root element', () => {
		const { container } = renderUI(
			<Accordion type="single" id="a11y-accordion" data-testid="acc">
				<AccordionItem value="one">
					<AccordionTrigger>One</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		const root = bySlot(container, 'accordion')

		expect(root).toHaveAttribute('id', 'a11y-accordion')

		expect(root).toHaveAttribute('data-testid', 'acc')
	})

	it('joins a consumer ref to the root, and keeps the arrow keys', async () => {
		const user = setupUser()

		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(
			<Accordion ref={ref}>
				<AccordionItem value="one">
					<AccordionTrigger>One</AccordionTrigger>
					<AccordionPanel>Body one</AccordionPanel>
				</AccordionItem>
				<AccordionItem value="two">
					<AccordionTrigger>Two</AccordionTrigger>
					<AccordionPanel>Body two</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(ref.current).toBe(bySlot(container, 'accordion'))

		// Roving reads the internal ref, which the consumer ref joins.
		act(() => screen.getByRole('button', { name: 'One' }).focus())

		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
	})

	it('spreads a consumer onKeyDown onto the root element', () => {
		const onKeyDown = vi.fn()

		renderUI(
			<Accordion onKeyDown={onKeyDown}>
				<AccordionItem value="one">
					<AccordionTrigger>One</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		fireEvent.keyDown(screen.getByRole('button', { name: 'One' }), { key: 'x' })

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	// React drops a boolean on an unknown attribute, and it warns once for each
	// name in a process, so neither shows a leak reliably. A string reaches the
	// DOM whenever the prop does.
	it('keeps `collapsible` off the root element', () => {
		const leak = { collapsible: 'leak' } as unknown as { collapsible: boolean }

		const { container } = renderUI(
			<Accordion type="single" {...leak}>
				<AccordionItem value="one">
					<AccordionTrigger>One</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion')).not.toHaveAttribute('collapsible')
	})

	it('keeps the resolved data-slot against a consumer that passes its own', () => {
		const { container } = renderUI(
			// `data-slot` types through as any other `data-*` attribute; the root
			// writes its own after the spread, so the anchor survives the attempt.
			<Accordion type="single" data-slot="mine">
				<AccordionItem value="one">
					<AccordionTrigger>One</AccordionTrigger>
					<AccordionPanel>Body</AccordionPanel>
				</AccordionItem>
			</Accordion>,
		)

		expect(bySlot(container, 'accordion')).toBeInTheDocument()
	})
})
