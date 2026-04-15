import { describe, expect, it } from 'vitest'
import {
	Stepper,
	StepperDescription,
	StepperPanel,
	StepperPanels,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import { bySlot, renderUI, screen } from '../helpers'

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
})
