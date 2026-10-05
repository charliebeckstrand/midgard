import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Stepper,
	StepperDescription,
	StepperIndicator,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import type { Mount } from '../../primitives/mount'
import {
	act,
	allBySlot,
	attach,
	bySlot,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	setupUser,
	within,
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

describe('Stepper', () => {
	it('renders with data-slot="stepper"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const el = bySlot(container, 'stepper')

		expect(el).toBeInTheDocument()

		expect(screen.getByRole('list', { name: 'Steps' })).toBeInTheDocument()
	})

	it('reads a display-only stepper as a list of its steps', () => {
		renderUI(
			<Stepper value={1}>
				<StepperStep value={0}>
					<StepperTitle>Account</StepperTitle>
				</StepperStep>
				<StepperSeparator />
				<StepperStep value={1}>
					<StepperTitle>Profile</StepperTitle>
				</StepperStep>
				<StepperSeparator />
				<StepperStep value={2}>
					<StepperTitle>Confirm</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const list = screen.getByRole('list', { name: 'Steps' })

		expect(list).not.toHaveAttribute('aria-orientation')

		const items = within(list).getAllByRole('listitem')

		expect(items).toHaveLength(3)

		expect(items[1]).toHaveAttribute('aria-current', 'step')

		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
	})

	it('holds an ordered list of the step buttons in the toolbar of an interactive stepper', () => {
		renderUI(
			<Stepper defaultValue={0}>
				<StepperStep value={0}>
					<StepperTitle>Account</StepperTitle>
				</StepperStep>
				<StepperSeparator />
				<StepperStep value={1}>
					<StepperTitle>Profile</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const toolbar = screen.getByRole('toolbar', { name: 'Steps' })

		const list = within(toolbar).getByRole('list')

		expect(list.tagName).toBe('OL')

		// The separator is aria-hidden, so the list counts the steps only.
		const items = within(list).getAllByRole('listitem')

		expect(items).toHaveLength(2)

		expect(within(present(items[0], 'item')).getByRole('button')).toHaveAttribute(
			'aria-current',
			'step',
		)
	})

	it('roves the arrow keys across the step buttons inside the list', async () => {
		renderUI(
			<Stepper defaultValue={0} orientation="horizontal">
				<StepperStep value={0}>
					<StepperTitle>Account</StepperTitle>
				</StepperStep>
				<StepperSeparator />
				<StepperStep value={1}>
					<StepperTitle>Profile</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const [first, second] = screen.getAllByRole('button')

		expect(first?.tabIndex).toBe(0)

		expect(second?.tabIndex).toBe(-1)

		first?.focus()

		fireEvent.keyDown(present(first, 'first step'), { key: 'ArrowRight' })

		expect(document.activeElement).toBe(second)
	})

	it('takes an aria-label, so two steppers on one page have distinct names', () => {
		renderUI(
			<>
				<Stepper value={0} aria-label="Checkout">
					<StepperStep value={0}>
						<StepperTitle>Cart</StepperTitle>
					</StepperStep>
				</Stepper>
				<Stepper value={0} aria-label="Onboarding">
					<StepperStep value={0}>
						<StepperTitle>Profile</StepperTitle>
					</StepperStep>
				</Stepper>
			</>,
		)

		expect(screen.getByRole('list', { name: 'Checkout' })).toBeInTheDocument()

		expect(screen.getByRole('list', { name: 'Onboarding' })).toBeInTheDocument()
	})
})

describe('StepperTitle', () => {
	it('renders with data-slot="stepper-title"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>My Step</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-title')).toBeInTheDocument()

		expect(screen.getByText('My Step')).toBeInTheDocument()
	})
})

describe('StepperDescription', () => {
	it('renders with data-slot="stepper-description"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
					<StepperDescription>Details</StepperDescription>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-description')).toBeInTheDocument()

		expect(screen.getByText('Details')).toBeInTheDocument()
	})
})

describe('StepperIndicator', () => {
	it('names each step state for assistive tech', () => {
		const { container } = renderUI(
			<Stepper value={2} onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Two</StepperTitle>
				</StepperStep>
				<StepperStep value={3}>
					<StepperTitle>Three</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const steps = Array.from(
			container.querySelectorAll<HTMLButtonElement>('button[data-slot="stepper-step"]'),
		)

		// Completed/current/upcoming differ visually by color and the checkmark
		// glyph only (WCAG 1.4.1); each step's name must carry its state.
		expect(steps[0]).toHaveAccessibleName(expect.stringContaining('completed'))

		expect(steps[1]).toHaveAccessibleName(expect.stringContaining('current step'))

		expect(steps[2]).toHaveAccessibleName(expect.stringContaining('not started'))
	})

	it('draws a checkmark on a completed step, and none on the others', () => {
		const { container } = renderUI(
			<Stepper value={2}>
				<StepperStep value={1}>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Two</StepperTitle>
				</StepperStep>
				<StepperStep value={3}>
					<StepperTitle>Three</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const marks = allBySlot(container, 'stepper-indicator').map(
			(indicator) => indicator.querySelector('svg') !== null,
		)

		expect(marks).toEqual([true, false, false])
	})

	it('replaces the checkmark of a completed step with its children', () => {
		const { container } = renderUI(
			<Stepper value={2}>
				<StepperStep value={1}>
					<StepperIndicator>1</StepperIndicator>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const indicator = bySlot(container, 'stepper-indicator')

		expect(indicator?.querySelector('svg')).toBeNull()

		expect(indicator).toHaveTextContent(/^1, completed$/)
	})

	it('renders its children ahead of the state suffix', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperIndicator>1</StepperIndicator>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-indicator')).toHaveTextContent(/^1, current step$/)
	})
})

describe('StepperPanel', () => {
	it('renders matching panel content', () => {
		renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={1}>Panel Content</StepperPanel>
				</StepperPanels>
			</Stepper>,
		)

		expect(screen.getByText('Panel Content')).toBeInTheDocument()
	})

	it('keeps its derived ids when a consumer supplies competing ones', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={1} id="mine" aria-labelledby="theirs">
						Panel Content
					</StepperPanel>
				</StepperPanels>
			</Stepper>,
		)

		const panel = bySlot(container, 'stepper-panel')

		// The StepperStep derives the same pair from the shared baseId, so the
		// panel keeps them. Assert they are present, not merely that `mine` lost:
		// a bare `not.toHaveAttribute` also passes when the attribute is gone.
		expect(panel?.id).toBeTruthy()

		expect(panel?.id).not.toBe('mine')

		expect(panel?.getAttribute('aria-labelledby')).toBeTruthy()

		expect(panel?.getAttribute('aria-labelledby')).not.toBe('theirs')
	})

	it('returns null when value does not match the current step', () => {
		renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={2}>Hidden</StepperPanel>
				</StepperPanels>
			</Stepper>,
		)

		expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
	})

	it('associates the current step with its panel', () => {
		renderUI(
			<Stepper value={1} onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={1}>Panel Content</StepperPanel>
				</StepperPanels>
			</Stepper>,
		)

		const step = screen.getByRole('button')

		const panel = screen.getByRole('region')

		expect(step.getAttribute('aria-controls')).toBe(panel.id)

		expect(panel.getAttribute('aria-labelledby')).toBe(step.id)
	})
})

describe('StepperStep interactive mode', () => {
	it('renders steps as buttons when onValueChange is provided', () => {
		const { container } = renderUI(
			<Stepper value={1} onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const el = bySlot(container, 'stepper-step')

		expect(el?.tagName).toBe('BUTTON')
	})

	it('calls onValueChange when an interactive step is clicked', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Stepper value={1} onValueChange={onValueChange}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Step 2</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const second = container.querySelectorAll<HTMLButtonElement>(
			'[data-slot="stepper-step"]',
		)[1] as HTMLButtonElement

		fireEvent.click(second)

		expect(onValueChange).toHaveBeenCalledWith(2)
	})

	it('disables upcoming steps in linear mode', () => {
		const { container } = renderUI(
			<Stepper value={1} linear onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Step 2</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-slot="stepper-step"]')

		expect(buttons[1]).toBeDisabled()
	})

	it('respects an explicit disabled prop on a step', () => {
		const { container } = renderUI(
			<Stepper value={1} onValueChange={() => {}}>
				<StepperStep value={1} disabled>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-step')).toBeDisabled()
	})

	it('marks a disabled non-interactive step with data-disabled', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1} disabled>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const el = bySlot(container, 'stepper-step')

		expect(el?.tagName).toBe('LI')

		expect(el).toHaveAttribute('data-disabled', '')
	})

	it('partitions vertical-orientation children so non-indicator content lives in stepper-content', () => {
		const { container } = renderUI(
			<Stepper value={1} orientation="vertical">
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-content')).toBeInTheDocument()
	})

	// Asserted against `renderToString`, because the server render is what painted
	// the desktop row on a phone before hydration.
	it('lays out by CSS on the server when orientation is not set', () => {
		const html = renderToString(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const rootTag = html.match(/<ol[^>]*data-slot="stepper"[^>]*>/)?.[0] ?? ''

		expect(rootTag).toContain('flex-col')

		expect(rootTag).toContain('sm:flex-row')

		expect(html).toContain('data-slot="stepper-content"')
	})

	it('passes the current state through to descendants', () => {
		const { container } = renderUI(
			<Stepper value={2}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Step 2</StepperTitle>
				</StepperStep>
				<StepperStep value={3}>
					<StepperTitle>Step 3</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const states = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="stepper-step"]'),
		).map((el) => el.getAttribute('data-state'))

		expect(states).toEqual(['completed', 'current', 'upcoming'])
	})
})

describe('Stepper keyboard navigation', () => {
	function renderStepper() {
		const { container } = renderUI(
			<Stepper value={1} orientation="horizontal" onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
				<StepperStep value={2} disabled>
					<StepperTitle>Two</StepperTitle>
				</StepperStep>
				<StepperStep value={3}>
					<StepperTitle>Three</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		return Array.from(
			container.querySelectorAll<HTMLButtonElement>('button[data-slot="stepper-step"]'),
		)
	}

	it('moves focus across steps with arrows, skipping the disabled step', async () => {
		const user = setupUser()

		const steps = renderStepper()

		act(() => steps[0]?.focus())

		await user.keyboard('{ArrowRight}')

		expect(steps[2]).toHaveFocus()

		await user.keyboard('{Home}')

		expect(steps[0]).toHaveFocus()

		await user.keyboard('{End}')

		expect(steps[2]).toHaveFocus()
	})

	it('makes the step row a single Tab stop seated on the current step', () => {
		const { container } = renderUI(
			<Stepper value={3} onValueChange={() => {}}>
				<StepperStep value={1}>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
				<StepperStep value={2}>
					<StepperTitle>Two</StepperTitle>
				</StepperStep>
				<StepperStep value={3}>
					<StepperTitle>Three</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const steps = Array.from(
			container.querySelectorAll<HTMLButtonElement>('button[data-slot="stepper-step"]'),
		)

		// value=3 → the third step is current and holds the only tab stop.
		expect(steps.map((s) => s.tabIndex)).toEqual([-1, -1, 0])
	})

	it('navigates uncontrolled from defaultValue', async () => {
		const user = setupUser()

		renderUI(
			<Stepper defaultValue={0}>
				<StepperStep value={0}>One</StepperStep>
				<StepperStep value={1}>Two</StepperStep>
			</Stepper>,
		)

		// Uncontrolled: no `value`/`onValueChange`, yet the steps are interactive
		// and the stepper owns the index.
		expect(screen.getByRole('button', { name: /One/ })).toHaveAttribute('aria-current', 'step')

		await user.click(screen.getByRole('button', { name: /Two/ }))

		expect(screen.getByRole('button', { name: /Two/ })).toHaveAttribute('aria-current', 'step')
	})

	it('stays a display-only readout with a value and no handler', () => {
		renderUI(
			<Stepper value={0}>
				<StepperStep value={0}>One</StepperStep>
				<StepperStep value={1}>Two</StepperStep>
			</Stepper>,
		)

		// No way to advance, so steps render inert rather than as buttons.
		expect(screen.queryByRole('button', { name: /Two/ })).not.toBeInTheDocument()
	})

	describe('mount policy', () => {
		function Flow({ mount }: { mount?: Mount }) {
			return (
				<Stepper defaultValue={0} mount={mount}>
					<StepperStep value={0}>
						<StepperTitle>One</StepperTitle>
					</StepperStep>
					<StepperStep value={1}>
						<StepperTitle>Two</StepperTitle>
					</StepperStep>
					<StepperPanels>
						<StepperPanel value={0}>
							<input data-testid="first" defaultValue="" />
						</StepperPanel>
						<StepperPanel value={1}>Second panel</StepperPanel>
					</StepperPanels>
				</Stepper>
			)
		}

		const step = (name: string) => screen.getByRole('button', { name: new RegExp(name) })

		it('discards the outgoing panel by default', async () => {
			const user = setupUser()

			renderUI(<Flow />)

			await user.type(screen.getByTestId('first'), 'typed')

			await user.click(step('Two'))

			expect(screen.queryByTestId('first')).not.toBeInTheDocument()

			await user.click(step('One'))

			expect(screen.getByTestId<HTMLInputElement>('first').value).toBe('')
		})

		it('mount="lazy" carries panel state back across a step change', async () => {
			const user = setupUser()

			renderUI(<Flow mount="lazy" />)

			// The second step has never been visited, so its panel is absent.
			expect(screen.queryByText('Second panel')).not.toBeInTheDocument()

			await user.type(screen.getByTestId('first'), 'typed')

			await user.click(step('Two'))

			// Held hidden rather than unmounted — the panel has no transition to
			// wait on, so the hold applies on the step change itself.
			expect(screen.getByTestId('first')).not.toBeVisible()

			await user.click(step('One'))

			expect(screen.getByTestId<HTMLInputElement>('first').value).toBe('typed')
		})

		it('mount="always" lets every step reference its panel', () => {
			renderUI(<Flow mount="always" />)

			// Every panel is in the DOM, so aria-controls resolves off the current
			// step too — which it cannot under `active` or `lazy`.
			for (const name of ['One', 'Two']) {
				const controls = step(name).getAttribute('aria-controls')

				expect(controls).toBeTruthy()

				expect(document.getElementById(controls as string)).not.toBeNull()
			}
		})

		// The server renders nothing for a hidden Activity, so the panel of an
		// upcoming step is not in the server markup. Only the current step can
		// point at its panel there.
		it('mount="always" keeps aria-controls out of the server markup of a step off screen', () => {
			const markup = serverMarkup(<Flow mount="always" />)

			const steps = allBySlot(markup, 'stepper-step')

			expect(steps).toHaveLength(2)

			expect(allBySlot(markup, 'stepper-panel')).toHaveLength(1)

			expect(steps[0]).toHaveAttribute('aria-controls', getSlot(markup, 'stepper-panel').id)

			expect(steps[1]).not.toHaveAttribute('aria-controls')
		})

		it('mount="always" hydrates with no mismatch, then lets every step reference its panel', () => {
			const { onRecoverableError, consoleError } = hydrate(<Flow mount="always" />)

			expect(onRecoverableError).not.toHaveBeenCalled()

			expect(consoleError).not.toHaveBeenCalled()

			const controls = step('Two').getAttribute('aria-controls')

			expect(controls).toBeTruthy()

			expect(document.getElementById(controls as string)).toHaveTextContent('Second panel')
		})

		it('mount="lazy" leaves an unvisited step without a dangling reference', () => {
			renderUI(<Flow mount="lazy" />)

			expect(step('Two')).not.toHaveAttribute('aria-controls')
		})
	})
})
