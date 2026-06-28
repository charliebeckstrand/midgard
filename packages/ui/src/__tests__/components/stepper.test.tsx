import { describe, expect, it, vi } from 'vitest'
import {
	Stepper,
	StepperDescription,
	StepperPanel,
	StepperPanels,
	StepperSkeleton,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import { act, allBySlot, bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('Stepper', () => {
	it('pairs with an explicit StepperSkeleton in loading trees', () => {
		const { container } = renderUI(<StepperSkeleton steps={3} />)

		expect(bySlot(container, 'stepper')).not.toBeInTheDocument()

		// One indicator dot and one title line per step.
		expect(allBySlot(container, 'placeholder')).toHaveLength(6)
	})

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

		expect(screen.getByRole('toolbar', { name: 'Steps' })).toBeInTheDocument()
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

		expect(el?.tagName).toBe('DIV')

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
		const user = userEvent.setup()

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
})
