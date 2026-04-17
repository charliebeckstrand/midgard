import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@floating-ui/react', () => {
	const noop = () => {}
	const identity = <T,>(x: T) => x

	return {
		autoUpdate: noop,
		FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
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
})
