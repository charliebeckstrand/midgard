import type { DateDuration } from '@internationalized/date'
import { renderHook } from '@testing-library/react'
import type { KeyboardEvent, RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarActive, CalendarHandle } from '../../components/calendar'
import { stepDate } from '../../components/date-picker/date-picker-utilities'
import {
	type FooterButton,
	useDatePickerKeyboard,
} from '../../components/date-picker/use-date-picker-keyboard'
import { attach, makeKeyEvent } from '../helpers'

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

	// Each step and each page start on `from`.
	const moveGrid = vi.fn((step: DateDuration, from: Date) => stepDate(from, step))

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
			moveGrid,
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
		moveGrid,
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

	// B01-C06: the first arrow enters the month that the calendar shows, not the value's month.
	it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])(
		'enters the shown month on %s from null active',
		(key) => {
			const { handler, setActive, getInitialActiveDate } = setup({ active: null })

			const event = makeKeyEvent<HTMLElement>(key)

			handler(event)

			expect(event.preventDefault).toHaveBeenCalled()

			expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 2, 1) })

			expect(getInitialActiveDate).not.toHaveBeenCalled()
		},
	)

	// Q5: with no enabled day in the shown month, the arrow enters on the anchor.
	it('enters on the anchor from null active when the shown month has no entry day', () => {
		const { handler, setActive } = setup({ active: null, entryDate: null })

		handler(makeKeyEvent<HTMLElement>('ArrowRight'))

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 0, 15) })
	})

	it.each([
		['Enter', 'Enter'],
		['Space', ' '],
	])('selects the initial date on %s when active is null', (_name, key) => {
		const { handler, handleSelect } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(handleSelect).toHaveBeenCalledWith(new Date(2026, 0, 15))
	})
})

describe('useDatePickerKeyboard: grid zone', () => {
	const gridActive: CalendarActive = { zone: 'grid', date: new Date(2026, 0, 15) }

	it('moves a month on PageUp/PageDown and a year with Shift (APG date grid)', () => {
		const { handler, moveGrid, setActive } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>('PageUp'))

		expect(moveGrid).toHaveBeenCalledWith({ months: -1 }, new Date(2026, 0, 15))

		handler(makeKeyEvent<HTMLElement>('PageDown'))

		expect(moveGrid).toHaveBeenCalledWith({ months: 1 }, new Date(2026, 0, 15))

		handler(makeKeyEvent<HTMLElement>('PageUp', { shiftKey: true }))

		expect(moveGrid).toHaveBeenCalledWith({ years: -1 }, new Date(2026, 0, 15))

		handler(makeKeyEvent<HTMLElement>('PageDown', { shiftKey: true }))

		expect(moveGrid).toHaveBeenCalledWith({ years: 1 }, new Date(2026, 0, 15))

		expect(setActive).toHaveBeenCalledTimes(4)
	})

	it('materializes the grid highlight when Page keys arrive with no active zone', () => {
		const { handler, moveGrid, setActive } = setup({ active: null })

		handler(makeKeyEvent<HTMLElement>('PageDown'))

		expect(moveGrid).toHaveBeenCalledWith({ months: 1 }, new Date(2026, 0, 15))

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: expect.any(Date) })
	})

	it.each<[string, string, DateDuration]>([
		['moves grid date backward one day on ArrowLeft', 'ArrowLeft', { days: -1 }],
		['moves grid date forward one day on ArrowRight', 'ArrowRight', { days: 1 }],
		['moves grid date backward one week on ArrowUp', 'ArrowUp', { weeks: -1 }],
		['moves grid date forward one week on ArrowDown', 'ArrowDown', { weeks: 1 }],
	])('%s', (_name, key, step) => {
		const { handler, moveGrid, setActive } = setup({ active: gridActive })

		handler(makeKeyEvent<HTMLElement>(key))

		expect(moveGrid).toHaveBeenCalledWith(step, gridActive.date)

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

// A dialog with the header and the footer toolbars of the picker. Each button is a Tab stop
// and has its index in `data-index`.
function renderToolbars() {
	const dialog = attach(document.createElement('div'))

	const toolbar = (slot: string, count: number) => {
		const row = document.createElement('div')

		row.dataset.slot = slot

		for (let index = 0; index < count; index++) {
			const button = document.createElement('button')

			button.dataset.index = String(index)

			row.append(button)
		}

		dialog.append(row)

		return Array.from(row.querySelectorAll('button'))
	}

	const header = toolbar('calendar-header', 3)

	const footer = toolbar('calendar-footer', 2)

	const grid = document.createElement('button')

	// A day button of the calendar grid. It has its date in `data-date`.
	const day = document.createElement('button')

	day.dataset.date = '2026-01-20'

	dialog.append(grid, day)

	return { dialog, header, footer, grid, day }
}

// A key from `target` that gets to the handler on `dialog`. `init` adds fields such as `shiftKey`.
function keyFrom(
	key: string,
	target: Element,
	dialog: Element,
	init: Partial<KeyboardEvent<HTMLElement>> = {},
) {
	return makeKeyEvent<HTMLElement>(key, {
		...init,
		target,
		currentTarget: dialog as HTMLElement,
	})
}

// B01-C09, Q2: a header or footer button that has DOM focus acts as its zone of the model.
describe('useDatePickerKeyboard: Tab-focused toolbar buttons', () => {
	it('enters the shown month on ArrowDown from a focused header button', () => {
		const { dialog, header } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		handler(keyFrom('ArrowDown', header[2] as Element, dialog))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 2 })

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: new Date(2026, 2, 1) })

		expect(moveGrid).not.toHaveBeenCalled()
	})

	it('does not set the zone again for the active header button', () => {
		const { dialog, header } = renderToolbars()

		const { handler, setActive } = setup({ active: { zone: 'header', index: 1 } })

		handler(keyFrom('ArrowRight', header[1] as Element, dialog))

		expect(setActive).toHaveBeenCalledTimes(1)

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 2 })
	})

	it.each<[string, number, string, number]>([
		['wraps from Clear to Today on ArrowLeft', 0, 'ArrowLeft', 1],
		['wraps from Today to Clear on ArrowRight', 1, 'ArrowRight', 0],
	])('%s from a focused footer button', (_name, index, key, expected) => {
		const { dialog, footer } = renderToolbars()

		const { handler, setActive } = setup({ active: null })

		const event = keyFrom(key, footer[index] as Element, dialog)

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).toHaveBeenCalledWith({ zone: 'footer', index })

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'footer', index: expected })
	})

	it('enters the shown month on ArrowUp from a focused footer button', () => {
		const { dialog, footer } = renderToolbars()

		const { handler, setActive } = setup({ active: null })

		handler(keyFrom('ArrowUp', footer[1] as Element, dialog))

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: new Date(2026, 2, 1) })
	})

	// B01-C09, Q10, Q11: the dialog takes focus back only for the arrows and the Page keys, so
	// only those keys map the button.
	it.each(['Tab', 'Home'])('sets no zone on %s from a focused header button', (key) => {
		const { dialog, header } = renderToolbars()

		const { handler, setActive } = setup({ active: null })

		handler(keyFrom(key, header[1] as Element, dialog))

		expect(setActive).not.toHaveBeenCalled()
	})

	it('maps a focused header button on an arrow with no highlight', () => {
		const { dialog, header } = renderToolbars()

		const { handler, setActive } = setup({ active: null })

		handler(keyFrom('ArrowRight', header[1] as Element, dialog))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 1 })

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'header', index: 2 })
	})

	it('keeps the model zone for a key on the dialog itself', () => {
		const { dialog } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		handler(keyFrom('ArrowDown', dialog, dialog))

		expect(moveGrid).toHaveBeenCalledWith({ weeks: 1 }, new Date(2026, 0, 15))

		expect(setActive).toHaveBeenCalledTimes(1)
	})

	it('keeps the model zone for a key from a focused control outside the toolbars', () => {
		const { dialog, grid } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		handler(keyFrom('ArrowDown', grid, dialog))

		expect(moveGrid).toHaveBeenCalledWith({ weeks: 1 }, new Date(2026, 0, 15))

		expect(setActive).toHaveBeenCalledTimes(1)
	})
})

// B01-C12, Q8: a day button that has DOM focus acts as the grid zone at its date.
describe('useDatePickerKeyboard: a Tab-focused day button', () => {
	it('steps from the focused day on ArrowRight', () => {
		const { dialog, day } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		const event = keyFrom('ArrowRight', day, dialog)

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 0, 20) })

		expect(moveGrid).toHaveBeenCalledWith({ days: 1 }, new Date(2026, 0, 20))

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: new Date(2026, 0, 21) })
	})

	it('steps from the focused day, not the entry day, with no highlight', () => {
		const { dialog, day } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({ active: null })

		handler(keyFrom('ArrowUp', day, dialog))

		expect(moveGrid).toHaveBeenCalledWith({ weeks: -1 }, new Date(2026, 0, 20))

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: new Date(2026, 0, 13) })
	})

	it('does not set the zone again for the highlighted day', () => {
		const { dialog, day } = renderToolbars()

		const { handler, setActive } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 20) },
		})

		handler(keyFrom('ArrowLeft', day, dialog))

		expect(setActive).toHaveBeenCalledTimes(1)

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 0, 19) })
	})

	// B01-C12, Q11: the dialog takes focus back for the Page keys too, so they map the day.
	it.each<[string, boolean, DateDuration, Date]>([
		['PageDown', false, { months: 1 }, new Date(2026, 1, 20)],
		['PageUp', false, { months: -1 }, new Date(2025, 11, 20)],
		['PageDown', true, { years: 1 }, new Date(2027, 0, 20)],
	])('steps from the focused day on %s (Shift: %s)', (key, shiftKey, step, expected) => {
		const { dialog, day } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		const event = keyFrom(key, day, dialog, { shiftKey })

		handler(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(setActive).toHaveBeenCalledWith({ zone: 'grid', date: new Date(2026, 0, 20) })

		expect(moveGrid).toHaveBeenCalledWith(step, new Date(2026, 0, 20))

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: expected })
	})

	// Q11: a focused header button acts as the header zone, so a Page key steps from the anchor.
	it('steps from the anchor on PageDown from a focused header button', () => {
		const { dialog, header } = renderToolbars()

		const { handler, setActive, moveGrid } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 20) },
		})

		handler(keyFrom('PageDown', header[2] as Element, dialog))

		expect(setActive).toHaveBeenCalledWith({ zone: 'header', index: 2 })

		expect(moveGrid).toHaveBeenCalledWith({ months: 1 }, new Date(2026, 0, 15))

		expect(setActive).toHaveBeenLastCalledWith({ zone: 'grid', date: new Date(2026, 1, 15) })
	})

	// Q10, Q11: only an arrow or a Page key maps the day, so the hook keeps the highlight for Enter.
	// The dialog leaves Enter on a focused day to the button and does not call the hook.
	it('keeps the highlight, not the focused day, for Enter', () => {
		const { dialog, day } = renderToolbars()

		const { handler, setActive, handleSelect } = setup({
			active: { zone: 'grid', date: new Date(2026, 0, 15) },
		})

		handler(keyFrom('Enter', day, dialog))

		expect(setActive).not.toHaveBeenCalled()

		expect(handleSelect).toHaveBeenCalledWith(new Date(2026, 0, 15))
	})
})
