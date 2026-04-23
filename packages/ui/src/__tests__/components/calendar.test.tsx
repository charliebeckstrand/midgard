import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@floating-ui/react', () => {
	const noop = () => {}
	const identity = <T,>(x: T) => x

	type MockContext = { open?: boolean; onOpenChange?: (open: boolean) => void }

	type MockInteraction = { reference?: { onClick?: (e: unknown) => void } }

	return {
		autoUpdate: noop,
		FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
		flip: () => ({}),
		offset: () => ({}),
		shift: () => ({}),
		size: () => ({}),
		useClick: (ctx: MockContext): MockInteraction => ({
			reference: {
				onClick: () => ctx?.onOpenChange?.(!ctx?.open),
			},
		}),
		useDismiss: (): MockInteraction => ({}),
		useFloating: (opts: MockContext) => ({
			refs: {
				setReference: noop,
				setFloating: noop,
				reference: { current: null },
				floating: { current: null },
			},
			floatingStyles: {},
			context: { open: opts?.open, onOpenChange: opts?.onOpenChange } as MockContext,
			x: 0,
			y: 0,
			strategy: 'absolute',
			placement: 'bottom',
			middlewareData: {},
			isPositioned: true,
			update: noop,
		}),
		useInteractions: (interactions: MockInteraction[] = []) => ({
			getReferenceProps: (userProps: Record<string, unknown> = {}) => {
				const merged: Record<string, unknown> = { ...userProps }
				for (const interaction of interactions) {
					const onClick = interaction?.reference?.onClick
					if (typeof onClick === 'function') {
						const existing = merged.onClick as ((e: unknown) => void) | undefined
						merged.onClick = (e: unknown) => {
							existing?.(e)
							onClick(e)
						}
					}
				}
				return merged
			},
			getFloatingProps: identity,
			getItemProps: identity,
		}),
		useRole: (): MockInteraction => ({}),
	}
})

import { Calendar, type CalendarHandle } from '../../components/calendar'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Calendar', () => {
	it('renders with data-slot="calendar"', () => {
		const { container } = renderUI(<Calendar />)

		const el = bySlot(container, 'calendar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Calendar className="custom" />)

		const el = bySlot(container, 'calendar')

		expect(el?.className).toContain('custom')
	})

	it('renders navigation buttons', () => {
		renderUI(<Calendar />)

		expect(screen.getByLabelText('Previous month')).toBeInTheDocument()

		expect(screen.getByLabelText('Next month')).toBeInTheDocument()
	})

	it('renders weekday labels', () => {
		const { container } = renderUI(<Calendar />)

		const el = bySlot(container, 'calendar')

		expect(el?.textContent).toContain('Su')
		expect(el?.textContent).toContain('Mo')
	})

	it('renders day buttons in a listbox', () => {
		renderUI(<Calendar />)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('calls onChange when a day is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<Calendar onChange={onChange} />)

		const user = userEvent.setup()

		const buttons = screen.getAllByRole('button')

		const dayButton = buttons.find((b) => b.textContent === '15')

		if (dayButton) {
			await user.click(dayButton)

			expect(onChange).toHaveBeenCalled()
		}
	})

	it('exposes imperative handle via ref', () => {
		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} />)

		expect(ref.current).toBeDefined()

		expect(typeof ref.current?.prevMonth).toBe('function')

		expect(typeof ref.current?.nextMonth).toBe('function')

		expect(typeof ref.current?.openPicker).toBe('function')
	})

	it('changes the month when the previous / next nav buttons are clicked', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		const heading = screen.getByRole('button', { name: /June 2025/ })

		expect(heading).toBeInTheDocument()

		await user.click(screen.getByLabelText('Next month'))

		expect(screen.getByRole('button', { name: /July 2025/ })).toBeInTheDocument()

		await user.click(screen.getByLabelText('Previous month'))

		expect(screen.getByRole('button', { name: /June 2025/ })).toBeInTheDocument()
	})
})

describe('Calendar month/year picker', () => {
	function openPicker(label: RegExp) {
		const monthButton = screen.getByRole('button', { name: label })

		return monthButton
	}

	it('opens the month picker when the header label is clicked', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		expect(screen.getByRole('button', { name: 'Previous year' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Next year' })).toBeInTheDocument()
	})

	it('navigates years inside the month picker', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: 'Next year' }))

		expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Previous year' }))

		expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument()
	})

	it('switches the calendar month when a month cell is selected', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: 'Mar' }))

		expect(screen.getByRole('button', { name: /March 2025/ })).toBeInTheDocument()
	})

	it('opens the year picker from the month picker and navigates decades', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		expect(screen.getByRole('button', { name: 'Previous decade' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Next decade' }))

		expect(screen.getByRole('button', { name: /2030\s*–\s*2039/ })).toBeInTheDocument()
	})

	it('selects a year and returns to the month picker', async () => {
		const user = userEvent.setup()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		await user.click(screen.getByRole('button', { name: '2028' }))

		// Back in month picker with the newly selected year
		expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Jan' })).toBeInTheDocument()
	})
})
