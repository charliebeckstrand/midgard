import { describe, expect, it, vi } from 'vitest'
import {
	Stepper,
	StepperDescription,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Stepper value={1} className="custom">
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		const el = bySlot(container, 'stepper')

		expect(el?.className).toContain('custom')
	})
})

describe('StepperStep', () => {
	it('renders with data-slot="stepper-step"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-step')).toBeInTheDocument()
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

describe('StepperSeparator', () => {
	it('renders with data-slot="stepper-separator"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperSeparator />
				<StepperStep value={2}>
					<StepperTitle>Step 2</StepperTitle>
				</StepperStep>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-separator')).toBeInTheDocument()
	})
})

describe('StepperPanels', () => {
	it('renders with data-slot="stepper-panels"', () => {
		const { container } = renderUI(
			<Stepper value={1}>
				<StepperStep value={1}>
					<StepperTitle>Step 1</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={1}>Panel 1</StepperPanel>
				</StepperPanels>
			</Stepper>,
		)

		expect(bySlot(container, 'stepper-panels')).toBeInTheDocument()
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

		expect(el).toHaveAttribute('data-disabled', 'true')
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
