import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCalendarFocus } from '../../components/calendar/use-calendar-focus'
import { attach, makeKeyEvent, present } from '../helpers'

function makeContainer(buttonCount: number) {
	const el = document.createElement('div')

	for (let i = 0; i < buttonCount; i++) {
		const btn = document.createElement('button')

		btn.textContent = String(i)

		btn.setAttribute('tabindex', '0')

		el.appendChild(btn)
	}

	return attach(el)
}

function setup(
	options: {
		cols?: number
		stopPropagation?: boolean
		footer?: boolean
		headerButtons?: number
		gridButtons?: number
		footerButtons?: number
		gridMounted?: boolean
	} = {},
) {
	const header = makeContainer(options.headerButtons ?? 3)

	const grid = makeContainer(options.gridButtons ?? 14)

	const footer = options.footer ? makeContainer(options.footerButtons ?? 2) : null

	const { result } = renderHook(() =>
		useCalendarFocus({
			headerRef: { current: header },
			gridRef: { current: grid },
			footerRef: footer ? { current: footer } : undefined,
			cols: options.cols ?? 7,
			stopPropagation: options.stopPropagation ?? false,
			gridMounted: options.gridMounted,
		}),
	)

	return { header, grid, footer, ...result.current }
}

describe('useCalendarFocus: header', () => {
	it('ArrowDown moves focus from header to the first grid button', () => {
		const { header, grid, handleHeaderKeyDown } = setup()

		const event = makeKeyEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(grid.querySelector('button'))

		// sanity: focus leaves the header
		expect(header.contains(document.activeElement)).toBe(false)
	})

	it('stopPropagation propagates to header events when configured', () => {
		const { handleHeaderKeyDown } = setup({ stopPropagation: true })

		const event = makeKeyEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})
})

describe('useCalendarFocus: grid', () => {
	it('ArrowUp from the top row focuses the middle header button', () => {
		const { header, grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		// Top row = first `cols` buttons. Focus index 0.
		const first = present<HTMLButtonElement>(grid.querySelector('button'), 'button')

		first.focus()

		const event = makeKeyEvent('ArrowUp')

		handleGridKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const headerButtons = header.querySelectorAll('button')

		expect(document.activeElement).toBe(headerButtons.item(Math.floor(headerButtons.length / 2)))
	})

	it('ArrowDown from the bottom row focuses the first footer button when footer is provided', () => {
		const { grid, footer, handleGridKeyDown } = setup({
			cols: 7,
			gridButtons: 14,
			footer: true,
		})

		const buttons = grid.querySelectorAll('button')

		const lastRowFirst = buttons.item(buttons.length - 7) as HTMLButtonElement

		lastRowFirst.focus()

		const event = makeKeyEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(document.activeElement).toBe(footer?.querySelector('button'))
	})

	it('ArrowDown from the bottom row keeps focus inside the grid when there is no footer', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14 })

		const buttons = grid.querySelectorAll('button')

		const last = buttons.item(buttons.length - 1) as HTMLButtonElement

		last.focus()

		handleGridKeyDown(makeKeyEvent('ArrowDown'))

		// With no footer, the calendar delegates to the roving grid handler, which
		// keeps focus inside the grid rather than escaping to another zone.
		expect(grid.contains(document.activeElement)).toBe(true)
	})
})

describe('useCalendarFocus: footer', () => {
	it('ArrowUp moves focus back to the last grid button when roving does not manage the Tab stop', () => {
		const { grid, footer, handleFooterKeyDown } = setup({ footer: true, gridMounted: false })

		const footerFirst = present<HTMLButtonElement>(footer?.querySelector('button'), 'button')

		footerFirst.focus()

		const event = makeKeyEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const buttons = grid.querySelectorAll('button')

		expect(document.activeElement).toBe(buttons.item(buttons.length - 1))
	})

	it('ArrowRight wraps to the first footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(1) as HTMLButtonElement | undefined)?.focus()

		handleFooterKeyDown(makeKeyEvent('ArrowRight'))

		expect(document.activeElement).toBe(buttons?.item(0))
	})

	it('ArrowLeft wraps to the last footer button', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, footerButtons: 2 })

		const buttons = footer?.querySelectorAll('button')

		;(buttons?.item(0) as HTMLButtonElement | undefined)?.focus()

		handleFooterKeyDown(makeKeyEvent('ArrowLeft'))

		expect(document.activeElement).toBe(buttons?.item(1))
	})

	it('ArrowLeft is a no-op when focus is outside the footer', () => {
		const { handleFooterKeyDown } = setup({ footer: true })

		const event = makeKeyEvent('ArrowLeft')

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('ignores non-arrow keys in the footer handler', () => {
		const { handleFooterKeyDown } = setup({ footer: true })

		const event = makeKeyEvent('a')

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('stopPropagation propagates from footer ArrowUp when configured', () => {
		const { footer, handleFooterKeyDown } = setup({ footer: true, stopPropagation: true })

		;(footer?.querySelector('button') as HTMLButtonElement | undefined)?.focus()

		const event = makeKeyEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from footer ArrowRight when configured', () => {
		const { footer, handleFooterKeyDown } = setup({
			footer: true,
			footerButtons: 2,
			stopPropagation: true,
		})

		;(footer?.querySelector('button') as HTMLButtonElement | undefined)?.focus()

		const event = makeKeyEvent('ArrowRight')

		handleFooterKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('treats a missing footerRef as no footer for keyboard navigation', () => {
		// `footerRef` is optional; passing it as undefined leaves the inner
		// `(footerRef?.current ?? null)` chain on the nullish branch rather
		// than throwing.
		const grid = makeContainer(14)

		const header = makeContainer(3)

		const { result } = renderHook(() =>
			useCalendarFocus({ headerRef: { current: header }, gridRef: { current: grid } }),
		)

		expect(() => result.current.handleFooterKeyDown(makeKeyEvent('ArrowLeft'))).not.toThrow()
	})
})

describe('useCalendarFocus: stopPropagation paths', () => {
	it('stopPropagation propagates from header keydown when the roving handler prevents default', () => {
		const { header, handleHeaderKeyDown } = setup({ stopPropagation: true })

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		// ArrowRight goes through the header roving handler, which calls
		// preventDefault; that's the path line 82 guards.
		const event = makeKeyEvent('ArrowRight')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('does not stopPropagation from header keydown when the roving handler is a no-op', () => {
		const { handleHeaderKeyDown } = setup({ stopPropagation: true })

		// 'a' has no roving binding, so preventDefault is never called and
		// the late `defaultPrevented` guard leaves stopPropagation alone.
		const event = makeKeyEvent('a')

		handleHeaderKeyDown(event)

		expect(event.stopPropagation).not.toHaveBeenCalled()
	})

	it('stopPropagation propagates from ArrowUp at the top row of the grid when configured', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14, stopPropagation: true })

		present<HTMLButtonElement>(grid.querySelector('button'), 'button').focus()

		const event = makeKeyEvent('ArrowUp')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from ArrowDown at the bottom row when a footer is present', () => {
		const { grid, handleGridKeyDown } = setup({
			cols: 7,
			gridButtons: 14,
			footer: true,
			stopPropagation: true,
		})

		const buttons = grid.querySelectorAll('button')

		;(buttons.item(buttons.length - 7) as HTMLButtonElement).focus()

		const event = makeKeyEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('stopPropagation propagates from grid keydown when the roving handler prevents default', () => {
		const { grid, handleGridKeyDown } = setup({ cols: 7, gridButtons: 14, stopPropagation: true })

		// Mid-grid focus: ArrowRight hits the roving grid handler, which calls
		// preventDefault and triggers the late `defaultPrevented` guard.
		const buttons = grid.querySelectorAll('button')

		;(buttons.item(3) as HTMLButtonElement).focus()

		const event = makeKeyEvent('ArrowRight')

		handleGridKeyDown(event)

		expect(event.stopPropagation).toHaveBeenCalled()
	})
})

/**
 * The days of June 2025, one button for each day, and the hook with the date
 * model of a day grid. The buttons of the days outside `min` and `max` are
 * disabled, as in Calendar. Set `footer` to give the hook a footer of two buttons.
 */
function setupJune({
	footer: withFooter,
	...range
}: {
	min?: Date
	max?: Date
	footer?: boolean
} = {}) {
	const days = Array.from({ length: 30 }, (_, i) => new Date(2025, 5, i + 1))

	const header = makeContainer(3)

	const grid = makeContainer(days.length)

	for (const [index, button] of grid.querySelectorAll('button').entries()) {
		const day = days[index] as Date

		button.disabled =
			(range.min !== undefined && day < range.min) || (range.max !== undefined && day > range.max)
	}

	const footer = withFooter ? makeContainer(2) : null

	const navigateTo = vi.fn()

	const { result } = renderHook(() =>
		useCalendarFocus({
			headerRef: { current: header },
			gridRef: { current: grid },
			footerRef: footer ? { current: footer } : undefined,
			dayGrid: { days, navigateTo, ...range },
		}),
	)

	/** Focuses the button of day `n` of June. */
	const focusDay = (n: number) =>
		(grid.querySelectorAll('button').item(n - 1) as HTMLElement).focus()

	return { header, grid, footer, navigateTo, focusDay, ...result.current }
}

// A day grid that no parent steers steps the month at its edges and on the Page
// keys, as the WAI-ARIA APG date grid does.
describe('useCalendarFocus: day grid', () => {
	it('steps to the next month when ArrowRight leaves the last day', () => {
		const { navigateTo, focusDay, handleGridKeyDown } = setupJune()

		focusDay(30)

		const event = makeKeyEvent('ArrowRight')

		handleGridKeyDown(event)

		expect(navigateTo).toHaveBeenCalledExactlyOnceWith(2025, 6)

		expect(event.preventDefault).toHaveBeenCalled()
	})

	it('steps to the previous month, not to the header, when ArrowUp leaves the top row', () => {
		const { header, navigateTo, focusDay, handleGridKeyDown } = setupJune()

		focusDay(3)

		const event = makeKeyEvent('ArrowUp')

		handleGridKeyDown(event)

		expect(navigateTo).toHaveBeenCalledExactlyOnceWith(2025, 4)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(header.contains(document.activeElement)).toBe(false)
	})

	it('steps to the next month, not to the footer, when ArrowDown leaves the bottom row', () => {
		const { footer, navigateTo, focusDay, handleGridKeyDown } = setupJune({ footer: true })

		focusDay(28)

		const event = makeKeyEvent('ArrowDown')

		handleGridKeyDown(event)

		expect(navigateTo).toHaveBeenCalledExactlyOnceWith(2025, 6)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(footer?.contains(document.activeElement)).toBe(false)
	})

	it('steps a month with PageUp and a year with Shift+PageDown', () => {
		const { navigateTo, focusDay, handleGridKeyDown } = setupJune()

		focusDay(15)

		const page = makeKeyEvent('PageUp')

		handleGridKeyDown(page)

		expect(navigateTo).toHaveBeenLastCalledWith(2025, 4)

		expect(page.preventDefault).toHaveBeenCalled()

		focusDay(15)

		handleGridKeyDown(makeKeyEvent('PageDown', { shiftKey: true }))

		expect(navigateTo).toHaveBeenLastCalledWith(2026, 5)
	})

	// A day of the shown month outside min and max is disabled. An arrow toward it
	// goes to its day held between min and max, and the focus stays when that is
	// the focused day. The arrow does not wrap or leave the grid.
	it.each<[string, string, { min?: Date; max?: Date }, number]>([
		['ArrowLeft from the min day', 'ArrowLeft', { min: new Date(2025, 5, 10) }, 10],
		['ArrowRight from the max day', 'ArrowRight', { max: new Date(2025, 5, 20) }, 20],
	])('keeps the focus, and consumes the key, on %s', (_name, key, options, day) => {
		const { grid, navigateTo, focusDay, handleGridKeyDown } = setupJune(options)

		focusDay(day)

		const event = makeKeyEvent(key)

		handleGridKeyDown(event)

		expect(document.activeElement).toBe(grid.querySelectorAll('button').item(day - 1))

		expect(event.preventDefault).toHaveBeenCalled()

		expect(navigateTo).not.toHaveBeenCalled()
	})

	it.each<[string, string, { min?: Date; max?: Date; footer?: boolean }, number, number]>([
		['ArrowUp from June 12 to min', 'ArrowUp', { min: new Date(2025, 5, 10) }, 12, 10],
		['ArrowDown from June 18 to max', 'ArrowDown', { max: new Date(2025, 5, 20) }, 18, 20],
		['ArrowDown past the month end to max', 'ArrowDown', { max: new Date(2025, 5, 28) }, 25, 28],
		[
			'ArrowDown from June 18 to max, with a footer',
			'ArrowDown',
			{ max: new Date(2025, 5, 20), footer: true },
			18,
			20,
		],
	])(
		'holds the target in the range, and consumes the key, on %s',
		(_name, key, options, from, to) => {
			const { grid, navigateTo, focusDay, handleGridKeyDown } = setupJune(options)

			focusDay(from)

			const event = makeKeyEvent(key)

			handleGridKeyDown(event)

			expect(document.activeElement).toBe(grid.querySelectorAll('button').item(to - 1))

			expect(event.preventDefault).toHaveBeenCalled()

			expect(navigateTo).not.toHaveBeenCalled()
		},
	)

	it('leaves an arrow inside the month to the roving grid', () => {
		const { grid, navigateTo, focusDay, handleGridKeyDown } = setupJune()

		focusDay(10)

		handleGridKeyDown(makeKeyEvent('ArrowRight'))

		expect(navigateTo).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(grid.querySelectorAll('button').item(10))
	})

	it('keeps the day at max, and the page still, when an arrow leaves the range', () => {
		const { grid, navigateTo, focusDay, handleGridKeyDown } = setupJune({
			max: new Date(2025, 5, 30),
		})

		focusDay(30)

		const event = makeKeyEvent('ArrowRight')

		handleGridKeyDown(event)

		expect(navigateTo).not.toHaveBeenCalled()

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement).toBe(grid.querySelectorAll('button').item(29))
	})
})

// The view holds years 1 to 9999. A `CalendarDate` clamps a sum past the last
// day to that day, so a step past it looks like a step inside December 9999.
describe('useCalendarFocus: day grid at the last day of year 9999', () => {
	function setupDecember9999() {
		const days = Array.from({ length: 31 }, (_, i) => new Date(9999, 11, i + 1))

		const grid = makeContainer(days.length)

		const navigateTo = vi.fn()

		const { result } = renderHook(() =>
			useCalendarFocus({
				headerRef: { current: makeContainer(3) },
				gridRef: { current: grid },
				dayGrid: { days, navigateTo },
			}),
		)

		const dayButton = (n: number) => grid.querySelectorAll('button').item(n - 1) as HTMLElement

		return { navigateTo, dayButton, ...result.current }
	}

	it.each<[string, number, string, { shiftKey?: boolean }]>([
		['ArrowDown from December 28', 28, 'ArrowDown', {}],
		['ArrowDown from December 25', 25, 'ArrowDown', {}],
		['ArrowRight from December 31', 31, 'ArrowRight', {}],
		['PageDown', 15, 'PageDown', {}],
		['Shift+PageDown', 15, 'PageDown', { shiftKey: true }],
	])('keeps the focus, and consumes the key, on %s', (_name, day, key, modifiers) => {
		const { navigateTo, dayButton, handleGridKeyDown } = setupDecember9999()

		dayButton(day).focus()

		const event = makeKeyEvent(key, modifiers)

		handleGridKeyDown(event)

		expect(document.activeElement).toBe(dayButton(day))

		expect(event.preventDefault).toHaveBeenCalled()

		expect(navigateTo).not.toHaveBeenCalled()
	})

	it('moves to December 31 with ArrowDown from December 24', () => {
		const { dayButton, handleGridKeyDown } = setupDecember9999()

		dayButton(24).focus()

		handleGridKeyDown(makeKeyEvent('ArrowDown'))

		expect(document.activeElement).toBe(dayButton(31))
	})
})

/** The state of one cell in a grid fixture. */
type CellState = { selected?: boolean; today?: boolean; disabled?: boolean; dataSelected?: boolean }

/** A grid of buttons with the attributes that a calendar cell renders. Each button shows its index. */
function makeGrid(cells: CellState[]) {
	const el = document.createElement('div')

	for (const [index, cell] of cells.entries()) {
		const btn = document.createElement('button')

		btn.textContent = String(index)

		btn.setAttribute('aria-selected', String(cell.selected === true))

		if (cell.today) btn.setAttribute('aria-current', 'date')

		if (cell.dataSelected) btn.setAttribute('data-selected', '')

		btn.disabled = cell.disabled === true

		el.appendChild(btn)
	}

	return attach(el)
}

/** The text of each enabled button in `container` that is a Tab stop. */
function tabStops(container: HTMLElement) {
	return Array.from(container.querySelectorAll('button'))
		.filter((btn) => !btn.disabled && btn.tabIndex === 0)
		.map((btn) => btn.textContent)
}

/** Mounts the hook on `grid` and a header of three buttons, and returns the header. */
function mountStops(grid: HTMLElement, options: { activeSelector?: string } = {}) {
	const header = makeContainer(3)

	const headerRef = { current: header }

	const gridRef = { current: grid }

	renderHook(() => useCalendarFocus({ headerRef, gridRef, ...options }))

	return header
}

// A keyboard user must cross a calendar with one Tab stop in the grid, not one
// stop for each day.
describe('useCalendarFocus: Tab stops', () => {
	it('holds one Tab stop in the grid, on the selected day before an earlier today', () => {
		const grid = makeGrid([{}, { today: true }, {}, { selected: true }, {}])

		mountStops(grid)

		expect(tabStops(grid)).toEqual(['3'])
	})

	it('seats the grid Tab stop on today when no enabled day is selected', () => {
		const grid = makeGrid([{}, { today: true }, {}, { selected: true, disabled: true }])

		mountStops(grid)

		expect(tabStops(grid)).toEqual(['1'])
	})

	it('seats the grid Tab stop on the first enabled day when no enabled day is selected or today', () => {
		const grid = makeGrid([{ disabled: true }, { disabled: true, today: true }, {}, {}])

		mountStops(grid)

		expect(tabStops(grid)).toEqual(['2'])
	})

	it('seats the grid Tab stop on the item that activeSelector names', () => {
		const grid = makeGrid([{ today: true }, {}, { dataSelected: true }, {}])

		mountStops(grid, { activeSelector: '[data-selected]' })

		expect(tabStops(grid)).toEqual(['2'])
	})

	it('seats the grid Tab stop only when gridMounted turns on', () => {
		const grid = makeGrid([{}, { selected: true }, {}])

		const headerRef = { current: makeContainer(3) }

		const gridRef = { current: grid }

		const { rerender } = renderHook(
			({ gridMounted }) => useCalendarFocus({ headerRef, gridRef, gridMounted }),
			{ initialProps: { gridMounted: false } },
		)

		expect(tabStops(grid)).toEqual(['0', '1', '2'])

		rerender({ gridMounted: true })

		expect(tabStops(grid)).toEqual(['1'])
	})

	it('keeps each header button as its own Tab stop', () => {
		const header = mountStops(makeGrid([{}, { selected: true }]))

		expect(tabStops(header)).toEqual(['0', '1', '2'])
	})
})

/**
 * Mounts the hook on a header of three buttons, `grid`, and a footer of two
 * buttons, and returns the zones with the handlers.
 */
function mountZones(
	grid: HTMLElement,
	options: { steered?: boolean; activeSelector?: string } = {},
) {
	const header = makeContainer(3)

	const footer = makeContainer(2)

	const { result } = renderHook(() =>
		useCalendarFocus({
			headerRef: { current: header },
			gridRef: { current: grid },
			footerRef: { current: footer },
			...options,
		}),
	)

	return { header, footer, ...result.current }
}

// The header ArrowDown and the footer ArrowUp enter the grid on its Tab stop,
// as Tab does. After a rove, that is the roved item. The first and the last
// button are the fallbacks when roving does not manage the stop and no item
// matches (see the header and footer cases above).
describe('useCalendarFocus: grid entry', () => {
	it('focuses the selected day on header ArrowDown', () => {
		const grid = makeGrid([{}, { today: true }, {}, { selected: true }, {}])

		const { header, handleHeaderKeyDown } = mountZones(grid)

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		const event = makeKeyEvent('ArrowDown')

		handleHeaderKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement?.textContent).toBe('3')
	})

	it('focuses today on header ArrowDown when no enabled day is selected', () => {
		const grid = makeGrid([{}, { today: true }, {}, { selected: true, disabled: true }])

		const { header, handleHeaderKeyDown } = mountZones(grid)

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		handleHeaderKeyDown(makeKeyEvent('ArrowDown'))

		expect(document.activeElement?.textContent).toBe('1')
	})

	it('focuses the selected day on footer ArrowUp', () => {
		const grid = makeGrid([{}, { selected: true }, {}, {}])

		const { footer, handleFooterKeyDown } = mountZones(grid)

		present<HTMLButtonElement>(footer.querySelector('button'), 'button').focus()

		const event = makeKeyEvent('ArrowUp')

		handleFooterKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement?.textContent).toBe('1')
	})

	it('focuses the item that activeSelector names on header ArrowDown', () => {
		const grid = makeGrid([{ today: true }, {}, { dataSelected: true }, {}])

		const { header, handleHeaderKeyDown } = mountZones(grid, { activeSelector: '[data-selected]' })

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		handleHeaderKeyDown(makeKeyEvent('ArrowDown'))

		expect(document.activeElement?.textContent).toBe('2')
	})

	it('focuses the roved day, not the selected day, on header ArrowDown', () => {
		const grid = makeGrid([{}, {}, {}, { selected: true }, {}])

		const { header, handleHeaderKeyDown } = mountZones(grid)

		// The focus moves the Tab stop to day 1, as a rove does.
		present<HTMLButtonElement>(grid.querySelectorAll('button').item(1), 'button').focus()

		expect(tabStops(grid)).toEqual(['1'])

		present<HTMLButtonElement>(header.querySelector('button'), 'button').focus()

		handleHeaderKeyDown(makeKeyEvent('ArrowDown'))

		expect(document.activeElement?.textContent).toBe('1')
	})

	it('focuses the Tab stop on footer ArrowUp when no item matches and roving manages the stop', () => {
		const grid = makeGrid([{}, {}, {}])

		const { footer, handleFooterKeyDown } = mountZones(grid)

		expect(tabStops(grid)).toEqual(['0'])

		present<HTMLButtonElement>(footer.querySelector('button'), 'button').focus()

		handleFooterKeyDown(makeKeyEvent('ArrowUp'))

		expect(document.activeElement?.textContent).toBe('0')
	})

	it('focuses the roved day, not the selected day, on footer ArrowUp', () => {
		const grid = makeGrid([{}, {}, {}, { selected: true }, {}])

		const { footer, handleFooterKeyDown } = mountZones(grid)

		present<HTMLButtonElement>(grid.querySelectorAll('button').item(1), 'button').focus()

		present<HTMLButtonElement>(footer.querySelector('button'), 'button').focus()

		handleFooterKeyDown(makeKeyEvent('ArrowUp'))

		expect(document.activeElement?.textContent).toBe('1')
	})
})

// A parent that steers the calendar owns the keys of the header, the grid, and
// the footer. The handlers then move no focus and call no preventDefault, so
// the key reaches the handler of the parent.
describe('useCalendarFocus: steered', () => {
	it.each(['ArrowDown', 'ArrowLeft', 'ArrowRight'])('leaves header %s to the parent', (key) => {
		const grid = makeGrid([{}, { selected: true }, {}])

		const { header, handleHeaderKeyDown } = mountZones(grid, { steered: true })

		const focused = present<HTMLButtonElement>(header.querySelectorAll('button').item(1), 'button')

		focused.focus()

		const event = makeKeyEvent(key)

		handleHeaderKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(focused)
	})

	it.each(['ArrowUp', 'ArrowLeft', 'ArrowRight'])('leaves footer %s to the parent', (key) => {
		const grid = makeGrid([{}, { selected: true }, {}])

		const { footer, handleFooterKeyDown } = mountZones(grid, { steered: true })

		const focused = present<HTMLButtonElement>(footer.querySelector('button'), 'button')

		focused.focus()

		const event = makeKeyEvent(key)

		handleFooterKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(focused)
	})

	it.each([
		['ArrowRight', 3],
		['ArrowUp', 3],
		['ArrowDown', 10],
		['ArrowLeft', 10],
	])('leaves grid %s from the day at index %i to the parent', (key, index) => {
		const grid = makeGrid(Array.from({ length: 14 }, () => ({})))

		const { handleGridKeyDown } = mountZones(grid, { steered: true })

		const focused = present<HTMLButtonElement>(
			grid.querySelectorAll('button').item(index),
			'button',
		)

		focused.focus()

		const event = makeKeyEvent(key)

		handleGridKeyDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(focused)
	})

	it('seats the grid Tab stop when steered', () => {
		const grid = makeGrid([{}, { selected: true }, {}])

		mountZones(grid, { steered: true })

		expect(tabStops(grid)).toEqual(['1'])
	})
})
