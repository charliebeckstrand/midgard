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
	/** The entry day of the Calendar. `null` when its shown month holds no enabled day. */
	entryDate: Date | null
}>

function setup(overrides: Setup = {}) {
	const setActive = vi.fn<(next: CalendarActive | null) => void>()

	const openCalendar = vi.fn()

	const closeCalendar = vi.fn()

	const moveGridDate = vi.fn((delta: number) => new Date(2026, 0, 15 + delta))

	const moveGridMonths = vi.fn((delta: number) => new Date(2026, 0 + delta, 15))

	const getInitialActiveDate = vi.fn(() => new Date(2026, 0, 15))

	// The day where the highlight enters the shown month, which header paging moved to March.
	const entryDate = overrides.entryDate === undefined ? new Date(2026, 2, 1) : overrides.entryDate

	const getViewEntryDate = vi.fn(() => entryDate)

	const handleSelect = vi.fn()

	const onFooterActivate = vi.fn()

	const calendarHandle: CalendarHandle = {
		prevMonth: vi.fn(),
		nextMonth: vi.fn(),
		openPicker: vi.fn(),
		footerKeyDown: vi.fn(),
		getEntryDate: vi.fn(() => entryDate),
	}

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
			moveGridMonths,
			getInitialActiveDate,
			getViewEntryDate,
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
		moveGridMonths,
		getInitialActiveDate,
		getViewEntryDate,
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

	it.each([
		['opens the calendar on ArrowUp', 'ArrowUp'],
		['opens the calendar on Enter', 'Enter'],
		['opens the calendar on Space', ' '],
	])('%s', (_name, key) => {
		const { handler, openCalendar } = setup({ open: false })

		handler(makeKeyEvent<HTMLElement>(key))

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

	it.each([
		['Enter', 'Enter'],
		['Space', ' '],
	])('selects the initial date on %s when active is null', (_name, key) => {
		const { handler, handleSelect } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(handleSelect).toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: grid zone', () => {
	const gridActive: CalendarActive = { zone: 'grid', date: new Date(2026, 0, 15) }

	it('moves a month on PageUp/PageDown and a year with Shift (APG date grid)', () => {
		const { handler, moveGridMonths, setActive } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('PageUp'))

		expect(moveGridMonths).toHaveBeenCalledWith(-1)

		handler(makeKeyEvent<HTMLElement>('PageDown'))

		expect(moveGridMonths).toHaveBeenCalledWith(1)

		handler(makeKeyEvent<HTMLElement>('PageUp', { shiftKey: true }))

		expect(moveGridMonths).toHaveBeenCalledWith(-12)

		handler(makeKeyEvent<HTMLElement>('PageDown', { shiftKey: true }))

		expect(moveGridMonths).toHaveBeenCalledWith(12)

		expect(setActive).toHaveBeenCalledTimes(4)
	})

	it('materializes the grid highlight when Page keys arrive with no active zone', () => {
		const { handler, moveGridMonths, setActive } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('PageDown'))

		expect(moveGridMonths).toHaveBeenCalledWith(1)

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: expect.any(Date) })
	})

	it.each<[string, string, number]>([
		['moves grid date backward one day on ArrowLeft', 'ArrowLeft', -1],
		['moves grid date forward one day on ArrowRight', 'ArrowRight', 1],
		['moves grid date backward one week on ArrowUp', 'ArrowUp', -7],
		['moves grid date forward one week on ArrowDown', 'ArrowDown', 7],
	])('%s', (_name, key, delta) => {
		const { handler, moveGridDate, setActive } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(moveGridDate).toHaveBeenCalledWith(delta)

		expect(setActive).toHaveBeenCalled()
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

/** The index of a header button: previous month, the picker, next month. */
type HeaderIndex = Extract<CalendarActive, { zone: 'header' }>['index']

describe('useDatePickerKeyboard: header zone', () => {
	it.each<[string, HeaderIndex, string, HeaderIndex]>([
		['wraps header index backward on ArrowLeft', 0, 'ArrowLeft', 2],
		['wraps header index forward on ArrowRight', 2, 'ArrowRight', 0],
		['decrements header index on ArrowLeft when not at index 0', 1, 'ArrowLeft', 0],
		['increments header index on ArrowRight when not at the last index', 0, 'ArrowRight', 1],
	])('%s', (_name, index, key, expected) => {
		const { handler, setActive } = setup({ active: { zone: 'header', index } })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: expected })
	})

	it('moves from header to grid on ArrowDown', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 1 } })

		handler(makeKeyEvent<HTMLElement>('ArrowDown'))

		expect(setActive).toHaveBeenCalledWith(expect.objectContaining({ zone: 'grid' }))
	})

	it('enters the shown month on ArrowDown, not the value or today', () => {
		const { handler, setActive, getInitialActiveDate } = setup({
			active: { zone: 'header', index: 0 },
		})

		handler(makeKeyEvent<HTMLElement>('ArrowDown'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 2, 1) })

		expect(getInitialActiveDate).not.toHaveBeenCalled()
	})

	it('keeps the highlight in the header on ArrowDown when the shown month has no entry day', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 0 }, entryDate: null })

		const event = makeKeyEvent<HTMLElement>('ArrowDown')

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it('swallows ArrowUp in the header zone', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 0 } })

		const event = makeKeyEvent<HTMLElement>('ArrowUp')

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it.each<[string, HeaderIndex, string, keyof CalendarHandle]>([
		['activates the previous-month button on Enter when index=0', 0, 'Enter', 'prevMonth'],
		['opens the picker on Enter when index=1', 1, 'Enter', 'openPicker'],
		['activates the next-month button on Enter when index=2', 2, 'Enter', 'nextMonth'],
		['activates the focused header button on Space', 1, ' ', 'openPicker'],
	])('%s', (_name, index, key, action) => {
		const { handler, calendarHandle } = setup({ active: { zone: 'header', index } })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(calendarHandle[action]).toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: footer zone', () => {
	it.each<[string, number, string, number]>([
		['wraps footer index backward on ArrowLeft', 0, 'ArrowLeft', 1],
		['wraps footer index forward on ArrowRight', 1, 'ArrowRight', 0],
		['decrements the footer index on ArrowLeft when not at index 0', 1, 'ArrowLeft', 0],
		['increments the footer index on ArrowRight when not at the last index', 0, 'ArrowRight', 1],
	])('%s', (_name, index, key, expected) => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index } })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(setActive).toHaveBeenCalledWith({ zone: 'footer', index: expected })
	})

	it('moves from footer to grid on ArrowUp', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 0 } })

		handler(makeKeyEvent<HTMLElement>('ArrowUp'))

		expect(setActive).toHaveBeenCalledWith(expect.objectContaining({ zone: 'grid' }))
	})

	it('enters the shown month on ArrowUp, not the value or today', () => {
		const { handler, setActive, getInitialActiveDate } = setup({
			active: { zone: 'footer', index: 0 },
		})

		handler(makeKeyEvent<HTMLElement>('ArrowUp'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 2, 1) })

		expect(getInitialActiveDate).not.toHaveBeenCalled()
	})

	it('keeps the highlight in the footer on ArrowUp when the shown month has no entry day', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 0 }, entryDate: null })

		const event = makeKeyEvent<HTMLElement>('ArrowUp')

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it('activates the footer button on Enter', () => {
		const { handler, onFooterActivate } = setup({
			active: { zone: 'footer', index: 1 },
			footerButtons: ['clear', 'today'],
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(onFooterActivate).toHaveBeenCalledWith('today')
	})

	it.each(['ArrowLeft', 'ArrowRight'])('does nothing on %s when footerButtons is empty', (key) => {
		const { handler, setActive } = setup({
			active: { zone: 'footer', index: 0 },
			footerButtons: [],
		})

		handler(makeKeyEvent<HTMLElement>(key))

		expect(setActive).not.toHaveBeenCalled()
	})

	it('swallows ArrowDown in the footer zone', () => {
		const { handler, setActive } = setup({ active: { zone: 'footer', index: 0 } })

		const event = makeKeyEvent<HTMLElement>('ArrowDown')

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it('activates the footer button on Space', () => {
		const { handler, onFooterActivate } = setup({
			active: { zone: 'footer', index: 0 },
			footerButtons: ['clear', 'today'],
		})

		handler(makeKeyEvent<HTMLElement>(' '))

		expect(onFooterActivate).toHaveBeenCalledWith('clear')
	})

	it('does not activate when Enter falls on a footer index past the available buttons', () => {
		const { handler, onFooterActivate } = setup({
			active: { zone: 'footer', index: 5 },
			footerButtons: ['clear', 'today'],
		})

		handler(makeKeyEvent<HTMLElement>('Enter'))

		expect(onFooterActivate).not.toHaveBeenCalled()
	})
})

describe('useDatePickerKeyboard: null active edge cases', () => {
	it('is a no-op on non-Enter/Space keys when active is null', () => {
		const { handler, handleSelect, setActive } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('a'))

		expect(handleSelect).not.toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it('swallows non-arrow keys in the grid zone', () => {
		const { handler, setActive, handleSelect } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		handler(makeKeyEvent<HTMLElement>('a'))

		expect(setActive).not.toHaveBeenCalled()

		expect(handleSelect).not.toHaveBeenCalled()
	})

	it('swallows non-arrow keys in the header zone', () => {
		const { handler, setActive } = setup({ active: { zone: 'header', index: 0 } })

		handler(makeKeyEvent<HTMLElement>('a'))

		expect(setActive).not.toHaveBeenCalled()
	})
})
