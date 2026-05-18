import { renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarActive, CalendarHandle } from '../../components/calendar'
import {
	type FooterButton,
	useDatePickerKeyboard,
} from '../../components/date-picker/use-date-picker-keyboard'
import { makeKeyEvent } from '../helpers'

type Setup = Partial<{
	disabled: boolean
	open: boolean
	active: CalendarActive | null
	footerButtons: FooterButton[]
	calendarHandle: CalendarHandle
}>

function setup(overrides: Setup = {}) {
	const setActive = vi.fn<(next: CalendarActive | null) => void>()
	const openCalendar = vi.fn()
	const closeCalendar = vi.fn()
	const moveGridDate = vi.fn((delta: number) => new Date(2026, 0, 15 + delta))
	const getInitialActiveDate = vi.fn(() => new Date(2026, 0, 15))
	const handleSelect = vi.fn()
	const onFooterActivate = vi.fn()

	const calendarHandle: CalendarHandle =
		overrides.calendarHandle ??
		({
			prevMonth: vi.fn(),
			nextMonth: vi.fn(),
			openPicker: vi.fn(),
		} as unknown as CalendarHandle)

	const calendarRef = { current: calendarHandle } as RefObject<CalendarHandle | null>

	const { result } = renderHook(() =>
		useDatePickerKeyboard({
			disabled: overrides.disabled ?? false,
			open: overrides.open ?? true,
			active: overrides.active ?? null,
			setActive,
			openCalendar,
			closeCalendar,
			moveGridDate,
			getInitialActiveDate,
			handleSelect,
			calendarRef,
			footerButtons: overrides.footerButtons ?? ['clear', 'today'],
			onFooterActivate,
		}),
	)

	return {
		handler: result.current,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		getInitialActiveDate,
		handleSelect,
		onFooterActivate,
		calendarHandle,
	}
}

describe('useDatePickerKeyboard: disabled', () => {
	it('ignores all keys when disabled', () => {
		const { handler, openCalendar } = setup({ disabled: true, open: false })

		handler(makeKeyEvent<HTMLElement>('ArrowDown'))

		expect(openCalendar).not.toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: closed calendar', () => {
	it('opens the calendar on ArrowDown', () => {
		const { handler, openCalendar } = setup({ open: false })

		const e = makeKeyEvent<HTMLElement>('ArrowDown')

		handler(e)

		expect(openCalendar).toHaveBeenCalled()

		expect(e.preventDefault).toHaveBeenCalled()
	})

	it('opens the calendar on ArrowUp', () => {
		const { handler, openCalendar } = setup({ open: false })

		handler(makeKeyEvent<HTMLElement>('ArrowUp'))

		expect(openCalendar).toHaveBeenCalled()
	})

	it('opens the calendar on Enter', () => {
		const { handler, openCalendar } = setup({ open: false })

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(openCalendar).toHaveBeenCalled()
	})

	it('opens the calendar on Space', () => {
		const { handler, openCalendar } = setup({ open: false })

		handler(makeKeyEvent<HTMLElement>(' '))

		expect(openCalendar).toHaveBeenCalled()
	})

	it('ignores other keys', () => {
		const { handler, openCalendar } = setup({ open: false })

		handler(makeKeyEvent<HTMLElement>('a'))

		expect(openCalendar).not.toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: open with null active', () => {
	it('closes on Escape', () => {
		const { handler, closeCalendar } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('Escape'))

		expect(closeCalendar).toHaveBeenCalled()
	})

	it('jumps to header on Shift+ArrowUp', () => {
		const { handler, setActive } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('ArrowUp', { shiftKey: true }))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 1 })
	})

	it('jumps to footer on Shift+ArrowDown', () => {
		const { handler, setActive } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('ArrowDown', { shiftKey: true }))

		expect(setActive).toHaveBeenCalledWith({ zone: 'footer', index: 0 })
	})

	it('does not jump to footer on Shift+ArrowDown when there are no footer buttons', () => {
		const { handler, setActive } = setup({ active: null, footerButtons: [] })

		handler(makeKeyEvent<HTMLElement>('ArrowDown', { shiftKey: true }))

		expect(setActive).not.toHaveBeenCalled()
	})

	it('materializes on grid when any arrow is pressed from null active', () => {
		const { handler, setActive, getInitialActiveDate } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('ArrowRight'))

		expect(getInitialActiveDate).toHaveBeenCalled()

		expect(setActive).toHaveBeenCalledWith(
			expect.objectContaining({ zone: 'grid', date: expect.any(Date) }),
		)
	})

	it('selects the initial date on Enter when active is null', () => {
		const { handler, handleSelect } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(handleSelect).toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: grid zone', () => {
	const gridActive: CalendarActive = { zone: 'grid', date: new Date(2026, 0, 15) }

	it('moves grid date backward one day on ArrowLeft', () => {
		const { handler, moveGridDate, setActive } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('ArrowLeft'))

		expect(moveGridDate).toHaveBeenCalledWith(-1)

		expect(setActive).toHaveBeenCalled()
	})

	it('moves grid date forward one day on ArrowRight', () => {
		const { handler, moveGridDate } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('ArrowRight'))

		expect(moveGridDate).toHaveBeenCalledWith(1)
	})

	it('moves grid date backward one week on ArrowUp', () => {
		const { handler, moveGridDate } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('ArrowUp'))

		expect(moveGridDate).toHaveBeenCalledWith(-7)
	})

	it('moves grid date forward one week on ArrowDown', () => {
		const { handler, moveGridDate } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('ArrowDown'))

		expect(moveGridDate).toHaveBeenCalledWith(7)
	})

	it('selects the active grid date on Enter', () => {
		const { handler, handleSelect } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(handleSelect).toHaveBeenCalledWith(gridActive.date)
	})

	it('selects on Space', () => {
		const { handler, handleSelect } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>(' '))

		expect(handleSelect).toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: header zone', () => {
	it('wraps header index backward on ArrowLeft', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 0 } })

		handler(makeKeyEvent<HTMLElement>('ArrowLeft'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 2 })
	})

	it('wraps header index forward on ArrowRight', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 2 } })

		handler(makeKeyEvent<HTMLElement>('ArrowRight'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 0 })
	})

	it('moves from header to grid on ArrowDown', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 1 } })

		handler(makeKeyEvent<HTMLElement>('ArrowDown'))

		expect(setActive).toHaveBeenCalledWith(expect.objectContaining({ zone: 'grid' }))
	})

	it('activates the previous-month button on Enter when index=0', () => {
		const prevMonth = vi.fn()

		const { handler } = setup({
			active: { zone: 'header', index: 0 },
			calendarHandle: {
				prevMonth,
				nextMonth: vi.fn(),
				openPicker: vi.fn(),
			} as unknown as CalendarHandle,
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(prevMonth).toHaveBeenCalled()
	})

	it('opens the picker on Enter when index=1', () => {
		const openPicker = vi.fn()

		const { handler } = setup({
			active: { zone: 'header', index: 1 },
			calendarHandle: {
				prevMonth: vi.fn(),
				nextMonth: vi.fn(),
				openPicker,
			} as unknown as CalendarHandle,
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(openPicker).toHaveBeenCalled()
	})

	it('activates the next-month button on Enter when index=2', () => {
		const nextMonth = vi.fn()

		const { handler } = setup({
			active: { zone: 'header', index: 2 },
			calendarHandle: {
				prevMonth: vi.fn(),
				nextMonth,
				openPicker: vi.fn(),
			} as unknown as CalendarHandle,
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(nextMonth).toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: footer zone', () => {
	it('wraps footer index backward on ArrowLeft', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 0 } })

		handler(makeKeyEvent<HTMLElement>('ArrowLeft'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'footer', index: 1 })
	})

	it('wraps footer index forward on ArrowRight', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 1 } })

		handler(makeKeyEvent<HTMLElement>('ArrowRight'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'footer', index: 0 })
	})

	it('moves from footer to grid on ArrowUp', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 0 } })

		handler(makeKeyEvent<HTMLElement>('ArrowUp'))

		expect(setActive).toHaveBeenCalledWith(expect.objectContaining({ zone: 'grid' }))
	})

	it('activates the footer button on Enter', () => {
		const { handler, onFooterActivate } = setup({
			active: { zone: 'footer', index: 1 },
			footerButtons: ['clear', 'today'],
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(onFooterActivate).toHaveBeenCalledWith('today')
	})

	it('does nothing on ArrowLeft when footerButtons is empty', () => {
		const { handler, setActive } = setup({
			active: { zone: 'footer', index: 0 },
			footerButtons: [],
		})

		handler(makeKeyEvent<HTMLElement>('ArrowLeft'))

		expect(setActive).not.toHaveBeenCalled()
	})
})
