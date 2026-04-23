import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@floating-ui/react', () => {
	const noop = () => {}
	const identity = <T,>(x: T) => x

	return {
		autoUpdate: noop,
		FloatingPortal: ({ children }: { children: ReactNode }) => children,
		flip: () => ({}),
		offset: () => ({}),
		shift: () => ({}),
		size: () => ({}),
		useClick: () => ({}),
		useDismiss: () => ({}),
		useFloating: () => ({
			refs: {
				setReference: noop,
				setFloating: noop,
				reference: { current: null },
				floating: { current: null },
			},
			floatingStyles: {},
			context: {},
			x: 0,
			y: 0,
			strategy: 'absolute',
			placement: 'bottom',
			middlewareData: {},
			isPositioned: true,
			update: noop,
		}),
		useInteractions: () => ({
			getReferenceProps: identity,
			getFloatingProps: identity,
			getItemProps: identity,
		}),
		useRole: () => ({}),
	}
})

import { DatePicker } from '../../components/datepicker'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

function findDay(day: number) {
	const buttons = screen.getAllByRole('button')

	return buttons.find((b) => b.textContent?.trim() === String(day))
}

describe('DatePicker', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(<DatePicker />)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger button', () => {
		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeInTheDocument()

		expect(button?.tagName).toBe('BUTTON')
	})

	it('shows placeholder text', () => {
		const { container } = renderUI(<DatePicker placeholder="Pick a date" />)

		expect(container.textContent).toContain('Pick a date')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<DatePicker className="custom" />)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('disables trigger when disabled', () => {
		const { container } = renderUI(<DatePicker disabled />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeDisabled()
	})

	it('displays formatted date when value is set', () => {
		const date = new Date(2025, 0, 15)

		const { container } = renderUI(<DatePicker value={date} />)

		expect(container.textContent).toContain('1/15/2025')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<DatePicker />, { skeleton: true })

		expect(bySlot(container, 'datepicker-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('opens the calendar content when the trigger is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		expect(button).toHaveAttribute('aria-expanded', 'true')
	})

	it('closes the calendar when the trigger is clicked again', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it('selects a date and calls onChange', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const defaultValue = new Date(2025, 5, 15)

		const { container } = renderUI(<DatePicker defaultValue={defaultValue} onChange={onChange} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		const day = findDay(20)

		if (!day) throw new Error('day 20 button not found')

		await user.click(day)

		expect(onChange).toHaveBeenCalled()

		const arg = onChange.mock.calls[0]?.[0] as Date

		expect(arg.getMonth()).toBe(5)
		expect(arg.getDate()).toBe(20)
	})

	it('clears the selected date when the clear footer button is pressed', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const defaultValue = new Date(2025, 5, 15)

		const { container } = renderUI(<DatePicker defaultValue={defaultValue} onChange={onChange} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByLabelText('Clear selection'))

		expect(onChange).toHaveBeenCalledWith(undefined)
	})

	it('selects today via the footer Today button', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		const { container } = renderUI(<DatePicker onChange={onChange} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		await user.click(screen.getByRole('button', { name: 'Today' }))

		expect(onChange).toHaveBeenCalled()

		const arg = onChange.mock.calls[0]?.[0] as Date

		expect(arg).toBeInstanceOf(Date)
	})
})

describe('DatePicker range', () => {
	it('renders trigger with range placeholder', () => {
		const { container } = renderUI(<DatePicker range placeholder="Pick dates" />)

		expect(container.textContent).toContain('Pick dates')
	})

	it('disables trigger when disabled', () => {
		const { container } = renderUI(<DatePicker range disabled />)

		const button = bySlot(container, 'datepicker-button')

		expect(button).toBeDisabled()
	})

	it('opens the range calendar when the trigger is clicked', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker range />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(bySlot(container, 'datepicker-content')).toBeInTheDocument()
	})

	it('displays formatted range when value is set', () => {
		const start = new Date(2025, 0, 1)
		const end = new Date(2025, 0, 10)

		const { container } = renderUI(<DatePicker range value={[start, end]} />)

		expect(container.textContent).toContain('1/1/2025')
	})

	it('closes the range calendar when the trigger is clicked again', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<DatePicker range />)

		const button = bySlot(container, 'datepicker-button') as HTMLButtonElement

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'true')

		await user.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it('exposes the clear footer button when a range is set', async () => {
		const user = userEvent.setup()

		const defaultValue: [Date, Date] = [new Date(2025, 5, 1), new Date(2025, 5, 3)]

		const { container } = renderUI(<DatePicker range defaultValue={defaultValue} />)

		await user.click(bySlot(container, 'datepicker-button') as HTMLButtonElement)

		expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
	})
})
