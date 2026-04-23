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

import { CalendarRange } from '../../components/calendar/calendar-range'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

function d(year: number, month: number, day: number) {
	return new Date(year, month - 1, day)
}

function findDay(day: number) {
	const buttons = screen.getAllByRole('button')

	return buttons.find((b) => b.textContent?.trim() === String(day))
}

describe('CalendarRange', () => {
	it('renders a calendar', () => {
		const { container } = renderUI(
			<CalendarRange rangeStart={d(2024, 3, 5)} rangeEnd={d(2024, 3, 10)} />,
		)

		expect(bySlot(container, 'calendar')).toBeInTheDocument()
	})

	it('applies a custom className to the calendar root', () => {
		const { container } = renderUI(
			<CalendarRange className="custom" rangeStart={d(2024, 3, 5)} rangeEnd={d(2024, 3, 10)} />,
		)

		expect(bySlot(container, 'calendar')?.className).toContain('custom')
	})

	it('marks the range start and end cells as selected', () => {
		const { container } = renderUI(
			<CalendarRange rangeStart={d(2024, 3, 5)} rangeEnd={d(2024, 3, 10)} />,
		)

		const selected = container.querySelectorAll('[aria-pressed="true"]')

		expect(selected.length).toBeGreaterThanOrEqual(2)
	})

	it('marks cells inside the range with a soft background', () => {
		renderUI(<CalendarRange rangeStart={d(2024, 3, 5)} rangeEnd={d(2024, 3, 10)} />)

		const inside = findDay(7)

		expect(inside).toHaveAttribute('aria-pressed', 'false')

		expect(inside?.className).toContain('rounded-none')
	})

	it('calls onHoverDate on mouse enter and leave of a day cell', () => {
		const onHoverDate = vi.fn()

		renderUI(
			<CalendarRange
				rangeStart={d(2024, 3, 5)}
				rangeEnd={d(2024, 3, 10)}
				onHoverDate={onHoverDate}
			/>,
		)

		const day = findDay(7) as HTMLElement

		fireEvent.mouseEnter(day)

		expect(onHoverDate).toHaveBeenCalledWith(expect.any(Date))

		fireEvent.mouseLeave(day)

		expect(onHoverDate).toHaveBeenCalledWith(null)
	})

	it('uses hoverDate for the effective range end when provided', () => {
		const { container } = renderUI(
			<CalendarRange rangeStart={d(2024, 3, 5)} hoverDate={d(2024, 3, 8)} />,
		)

		const selected = container.querySelectorAll('[aria-pressed="true"]')

		expect(selected.length).toBeGreaterThanOrEqual(1)
	})

	it('uses rangeStart as the default month when no end is provided', () => {
		renderUI(<CalendarRange rangeStart={d(2024, 3, 15)} />)

		expect(screen.getByText('March 2024')).toBeInTheDocument()
	})

	it('falls back to rangeEnd for the default month when there is no start', () => {
		renderUI(<CalendarRange rangeEnd={d(2024, 5, 20)} />)

		expect(screen.getByText('May 2024')).toBeInTheDocument()
	})

	it('invokes onChange when a day is clicked', () => {
		const onChange = vi.fn()

		renderUI(
			<CalendarRange rangeStart={d(2024, 3, 5)} rangeEnd={d(2024, 3, 10)} onChange={onChange} />,
		)

		const day = findDay(12) as HTMLElement

		fireEvent.click(day)

		expect(onChange).toHaveBeenCalled()
	})
})
