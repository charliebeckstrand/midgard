import { createRef, Profiler, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Calendar, type CalendarHandle, CalendarRange } from '../../components/calendar'
import { Form } from '../../components/form'
import { Box } from '../../structure/box'
import {
	act,
	bySlot,
	fireEvent,
	liveRegion,
	renderUI,
	screen,
	setupUser,
	withFakeTime,
} from '../helpers'

const selectedDay = () =>
	screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')

describe('Calendar', () => {
	it('renders navigation buttons, weekday labels, and day buttons in a listbox', () => {
		const { container } = renderUI(<Calendar />)

		expect(screen.getByLabelText('Previous month')).toBeInTheDocument()

		expect(screen.getByLabelText('Next month')).toBeInTheDocument()

		const el = bySlot(container, 'calendar')

		expect(el?.textContent).toContain('Su')

		expect(el?.textContent).toContain('Mo')

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('calls onValueChange when a day is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<Calendar onValueChange={onChange} />)

		const user = setupUser()

		const days = screen.getAllByRole('option')

		const dayButton = days.find((b) => b.textContent === '15')

		expect(dayButton).toBeDefined()

		await user.click(dayButton as HTMLElement)

		expect(onChange).toHaveBeenCalled()
	})

	it('exposes imperative handle via ref', () => {
		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} />)

		expect(ref.current).toBeDefined()

		expect(typeof ref.current?.prevMonth).toBe('function')

		expect(typeof ref.current?.nextMonth).toBe('function')

		expect(typeof ref.current?.openPicker).toBe('function')
	})

	it('mounts on the client in one commit, with today marked', () => {
		const onRender = vi.fn()

		renderUI(
			<Profiler id="calendar" onRender={onRender}>
				<Calendar />
			</Profiler>,
		)

		// A render that does not hydrate reads today at once, with no second commit.
		expect(onRender.mock.calls.map(([, phase]) => phase)).toEqual(['mount'])

		expect(
			screen.getAllByRole('option').filter((o) => o.hasAttribute('aria-current')),
		).toHaveLength(1)
	})

	it('names the Gregorian month, year, and days in a Buddhist-calendar locale', () => {
		// `th-TH` defaults to the Buddhist calendar, where 2025 is 2568.
		renderUI(<Calendar locale="th-TH" defaultValue={new Date(2025, 5, 15)} />)

		expect(screen.getByRole('listbox', { name: 'มิถุนายน 2025' })).toBeInTheDocument()

		expect(screen.getAllByRole('option')[14]).toHaveAccessibleName('วันอาทิตย์ที่ 15 มิถุนายน 2025')
	})

	it('writes the day numbers in the digits of the locale', () => {
		// `ar-EG` writes Arabic-Indic digits, as its month and day names do.
		renderUI(<Calendar locale="ar-EG" defaultValue={new Date(2025, 5, 15)} />)

		const day = screen.getAllByRole('option')[14]

		expect(day).toHaveTextContent('١٥')

		expect(day).toHaveAccessibleName(expect.stringContaining('١٥'))
	})

	it('keeps a single-select day listbox', () => {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable')
	})

	it('steps one month for each handle call in one event', () => {
		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} defaultValue={new Date(2025, 5, 15)} />)

		act(() => {
			ref.current?.nextMonth()

			ref.current?.nextMonth()
		})

		expect(screen.getByRole('listbox', { name: 'August 2025' })).toBeInTheDocument()
	})

	it('keeps a navigated month when the parent passes an equal value again', async () => {
		const user = setupUser()

		// A new `Date` on each render, as a parent that derives the value inline.
		const { rerender } = renderUI(<Calendar value={new Date(2025, 5, 15)} />)

		await user.click(screen.getByLabelText('Next month'))

		rerender(<Calendar value={new Date(2025, 5, 15)} />)

		expect(screen.getByRole('listbox', { name: 'July 2025' })).toBeInTheDocument()
	})

	it('announces the new month through the polite live region on navigation', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		// The announcer writes the region in a microtask. Flush it, so that an
		// announcement on mount shows here.
		await Promise.resolve()

		// Lazily created on first announce; absent means nothing was announced on mount.
		expect(liveRegion()?.textContent ?? '').toBe('')

		await user.click(screen.getByLabelText('Next month'))

		expect(liveRegion()).toHaveTextContent('July 2025')
	})

	it('changes the month when the previous / next nav buttons are clicked', async () => {
		const user = setupUser()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		const heading = screen.getByRole('button', { name: /June 2025/ })

		expect(heading).toBeInTheDocument()

		await user.click(screen.getByLabelText('Next month'))

		expect(screen.getByRole('button', { name: /July 2025/ })).toBeInTheDocument()

		await user.click(screen.getByLabelText('Previous month'))

		expect(screen.getByRole('button', { name: /June 2025/ })).toBeInTheDocument()
	})

	it('disables days outside the min/max range', () => {
		const defaultValue = new Date(2025, 5, 15)

		const min = new Date(2025, 5, 10)

		const max = new Date(2025, 5, 20)

		renderUI(<Calendar defaultValue={defaultValue} min={min} max={max} />)

		const days = screen.getAllByRole('option')

		const before = days.find((b) => b.textContent === '5')

		const after = days.find((b) => b.textContent === '25')

		const inside = days.find((b) => b.textContent === '15')

		expect(before).toBeDisabled()

		expect(after).toBeDisabled()

		expect(inside).not.toBeDisabled()
	})

	it('does not call onValueChange when a disabled day is clicked', async () => {
		const onChange = vi.fn()

		const min = new Date(2025, 5, 10)

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} min={min} onValueChange={onChange} />)

		const user = setupUser()

		const days = screen.getAllByRole('option')

		const disabledDay = days.find((b) => b.textContent === '5')

		expect(disabledDay, 'a day labeled 5 to be present').toBeDefined()

		await user.click(disabledDay as HTMLElement)

		expect(onChange).not.toHaveBeenCalled()
	})

	// Regression: the bare `Date(year, month, day)` constructor maps years 0–99
	// to 1900–1999. A year-1 value seeded a January 1901 view, and selections
	// came back as 1901.
	it('keeps a year below 100 through the view seed and day selection', async () => {
		const onChange = vi.fn()

		const yearOne = new Date(2000, 0, 15)

		yearOne.setFullYear(1)

		renderUI(<Calendar defaultValue={yearOne} onValueChange={onChange} />)

		const user = setupUser()

		const dayButton = screen.getAllByRole('option').find((b) => b.textContent === '20')

		expect(dayButton).toBeDefined()

		await user.click(dayButton as HTMLElement)

		const selected = onChange.mock.calls[0]?.[0] as Date

		expect([selected.getFullYear(), selected.getMonth(), selected.getDate()]).toEqual([1, 0, 20])
	})

	it('marks header zone buttons as active when active.zone is "header"', () => {
		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} active={{ zone: 'header', index: 1 }} />)

		// index 1 is the center picker trigger; `k.day.active` (focus.virtual)
		// paints its `outline-blue-600` ring. index 0 (Previous month) must stay bare.
		expect(screen.getByRole('button', { name: /June 2025/ })).toHaveClass('outline-blue-600')

		expect(screen.getByLabelText('Previous month')).not.toHaveClass('outline-blue-600')
	})

	it('forwards day rendering through getDayProps to customize variants', () => {
		const getDayProps = vi.fn(() => ({ className: 'custom-day' }))

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} getDayProps={getDayProps} />)

		expect(getDayProps).toHaveBeenCalled()

		const dayButtons = screen.getAllByRole('option')

		const styled = dayButtons.find((b) => b.className.includes('custom-day'))

		expect(styled).toBeDefined()
	})

	it('keeps the fill that getDayProps gives a selected day while the day is active', () => {
		const day = new Date(2025, 5, 15)

		renderUI(
			<Calendar
				defaultValue={day}
				active={{ zone: 'grid', date: day }}
				getDayProps={({ selected }) => (selected ? { color: 'red' } : {})}
			/>,
		)

		const cell = selectedDay()

		// The active ring paints, and the red solid fill holds under it.
		expect(cell).toHaveClass('outline-blue-600')

		expect(cell).toHaveClass('bg-red-600')

		expect(cell).not.toHaveClass('bg-blue-600')
	})

	it('respects an explicit size prop on the root', () => {
		const { container } = renderUI(<Calendar size="sm" />)

		const el = bySlot(container, 'calendar')

		expect(el).toHaveAttribute('data-density', 'sm')
	})

	it('opens no scope in an `xs` scope, because the weekday text has an `xs` step', () => {
		const { container } = renderUI(
			<Box density="xs">
				<Calendar />
			</Box>,
		)

		expect(bySlot(container, 'calendar')).not.toHaveAttribute('data-density')
	})

	it('opens no scope with no size outside an `xs` scope', () => {
		const { container } = renderUI(
			<Box density="lg">
				<Calendar />
			</Box>,
		)

		expect(bySlot(container, 'calendar')).not.toHaveAttribute('data-density')
	})
})

describe('Calendar day press', () => {
	it('reports a press of the selected day through onDayPress, and no value change', async () => {
		const user = setupUser()

		const onDayPress = vi.fn()

		const onValueChange = vi.fn()

		const day = new Date(2025, 5, 12)

		renderUI(<Calendar value={day} onValueChange={onValueChange} onDayPress={onDayPress} />)

		await user.click(screen.getByRole('option', { name: /\b12\b/ }))

		expect(onDayPress).toHaveBeenCalledTimes(1)

		expect((onDayPress.mock.calls[0]?.[0] as Date | undefined)?.getDate()).toBe(12)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('reports a second press of the range start day in CalendarRange', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		function Harness() {
			const [start, setStart] = useState<Date | null>(null)

			return (
				<CalendarRange
					rangeStart={start}
					onValueChange={(date) => {
						onValueChange(date)

						setStart(date)
					}}
				/>
			)
		}

		renderUI(<Harness />)

		await user.click(screen.getAllByRole('option', { name: /\b12\b/ })[0] as HTMLElement)

		await user.click(screen.getAllByRole('option', { name: /\b12\b/ })[0] as HTMLElement)

		expect(onValueChange).toHaveBeenCalledTimes(2)
	})
})

describe('Calendar month/year picker', () => {
	function openPicker(label: RegExp) {
		const monthButton = screen.getByRole('button', { name: label })

		return monthButton
	}

	it('opens the month picker from the header label and navigates years inside it', async () => {
		const user = setupUser()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: 'Next year' }))

		expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Previous year' }))

		expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument()
	})

	it('switches the calendar month when a month cell is selected', async () => {
		const user = setupUser()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('option', { name: 'Mar' }))

		expect(screen.getByRole('button', { name: /March 2025/ })).toBeInTheDocument()
	})

	it('exposes the month picker as a labeled listbox with a selected option', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		await user.click(openPicker(/June 2025/))

		expect(screen.getByRole('listbox', { name: 'Select month' })).toBeInTheDocument()

		expect(screen.getByRole('option', { name: 'Jun', selected: true })).toBeInTheDocument()
	})

	it('labels the picker panel as a dialog', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		await user.click(openPicker(/June 2025/))

		expect(screen.getByRole('dialog', { name: 'Choose month and year' })).toBeInTheDocument()
	})

	it('names Gregorian months and years in a locale with another default calendar', async () => {
		const user = setupUser()

		// `fa-IR` defaults to the Persian calendar. Its January is "ژانویه", not
		// "دی", the Persian month that holds January 1.
		renderUI(<Calendar locale="fa-IR" defaultValue={new Date(2025, 5, 15)} />)

		await user.click(screen.getByRole('button', { name: 'ژوئن ۲۰۲۵' }))

		expect(screen.getByRole('option', { name: 'ژانویه' })).toBeInTheDocument()

		// The picker year is the Gregorian year, in the digits of the header label.
		expect(screen.getByRole('button', { name: '۲۰۲۵' })).toBeInTheDocument()
	})

	it('opens the year picker from the month picker and navigates decades', async () => {
		const user = setupUser()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		expect(screen.getByRole('button', { name: 'Previous decade' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Next decade' }))

		expect(screen.getByRole('button', { name: /2030\s*–\s*2039/ })).toBeInTheDocument()
	})

	it('selects a year and returns to the month picker', async () => {
		const user = setupUser()

		const defaultValue = new Date(2025, 5, 15)

		renderUI(<Calendar defaultValue={defaultValue} />)

		await user.click(openPicker(/June 2025/))

		await user.click(screen.getByRole('button', { name: '2025' }))

		await user.click(screen.getByRole('option', { name: '2028' }))

		// Back in month picker with the newly selected year
		expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument()

		expect(screen.getByRole('option', { name: 'Jan' })).toBeInTheDocument()
	})

	it('reopens from the handle on the month grid of the calendar year', async () => {
		const user = setupUser()

		const ref = createRef<CalendarHandle>()

		renderUI(<Calendar ref={ref} defaultValue={new Date(2025, 5, 15)} />)

		await user.click(openPicker(/June 2025/))

		// Step the picker away from 2025, then leave it on the year grid.
		await user.click(screen.getByRole('button', { name: 'Next year' }))

		await user.click(screen.getByRole('button', { name: '2026' }))

		await user.keyboard('{Escape}')

		act(() => ref.current?.openPicker())

		expect(screen.getByRole('listbox', { name: 'Select month' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument()
	})

	// `@internationalized/date` clamps a year outside 1 to 9999, so a pick of
	// year 0 showed year 1.
	it('keeps the year picker inside years 1 to 9999', async () => {
		const user = setupUser()

		const yearFive = new Date(2000, 0, 15)

		yearFive.setFullYear(5)

		renderUI(<Calendar defaultValue={yearFive} />)

		await user.click(openPicker(/^January 5$/))

		await user.click(screen.getByRole('button', { name: '5' }))

		expect(screen.getByRole('option', { name: '0' })).toBeDisabled()

		expect(screen.getByRole('option', { name: '1' })).toBeEnabled()

		await user.click(screen.getByRole('button', { name: 'Previous decade' }))

		expect(screen.getByRole('button', { name: /^1\s*–\s*9$/ })).toBeInTheDocument()
	})
})

// Keyboard nav: roving focus through the day grid (WAI-ARIA grid pattern),
// grid<->header transitions, and Enter/Space activation. June 2025 starts on a
// Sunday; its days fill a clean 7-column grid and option[i] is day i+1.
describe('Calendar keyboard navigation', () => {
	const day = (n: string) =>
		screen.getAllByRole('option').find((option) => option.textContent === n) as HTMLElement

	function renderJune() {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)
	}

	it('moves day focus by one column with ArrowRight / ArrowLeft', async () => {
		const user = setupUser()

		renderJune()

		act(() => day('10').focus())

		await user.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(day('11'))

		await user.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('moves day focus by one week with ArrowDown / ArrowUp', async () => {
		const user = setupUser()

		renderJune()

		act(() => day('10').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('17'))

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('jumps to the first / last day with Home / End', async () => {
		const user = setupUser()

		renderJune()

		const options = screen.getAllByRole('option')

		act(() => day('10').focus())

		await user.keyboard('{Home}')

		expect(document.activeElement).toBe(options[0])

		await user.keyboard('{End}')

		expect(document.activeElement).toBe(options[options.length - 1])
	})

	// B01-C12, Q8: a parent that steers the calendar owns the keys of the grid.
	it('leaves ArrowUp on the top row to a parent that steers the calendar', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} active={null} />)

		act(() => day('1').focus())

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(day('1'))
	})

	it('moves focus from the header down into the day grid on the selected day', async () => {
		const user = setupUser()

		renderJune()

		act(() => screen.getByLabelText('Next month').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('15'))
	})

	it.each([
		['Enter', '{Enter}'],
		['Space', ' '],
	])('selects the focused day with %s', async (_name, key) => {
		const onChange = vi.fn()

		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} onValueChange={onChange} />)

		act(() => day('20').focus())

		await user.keyboard(key)

		expect(onChange).toHaveBeenCalledTimes(1)

		expect((onChange.mock.calls[0]?.[0] as Date | undefined)?.getDate()).toBe(20)
	})

	// Disabled (out-of-range) days render as `<button disabled>` and can't take
	// focus. In a calendar that no parent steers, an arrow toward a disabled day
	// moves the focus to the nearest enabled day, and the focus stays when that is
	// the focused day. The arrow does not wrap, and it does not move the focus out
	// of the grid. Tab and Shift+Tab still do.
	function renderMinTenth(defaultValue = new Date(2025, 5, 15)) {
		// June 2025 begins on a Sunday; `min` on the 10th disables June 1-9, so the
		// grid's first focusable day is the 10th.
		renderUI(<Calendar defaultValue={defaultValue} min={new Date(2025, 5, 10)} />)
	}

	/** June 2025 with `max` on the 20th, so June 21-30 are disabled. Set `footer` to add a footer after the calendar. */
	function renderMaxTwentieth({ footer = false } = {}) {
		const footerRef = createRef<HTMLDivElement>()

		renderUI(
			<>
				<Calendar
					defaultValue={new Date(2025, 5, 15)}
					max={new Date(2025, 5, 20)}
					footerRef={footer ? footerRef : undefined}
				/>
				{footer && (
					<div ref={footerRef}>
						<button type="button">Clear</button>
					</div>
				)}
			</>,
		)
	}

	it('enters the grid on the first enabled day when leading days are disabled', async () => {
		const user = setupUser()

		// The selected day, June 5, is before `min` and so disabled. No enabled
		// day holds the Tab stop, and the entry falls back to the first enabled day.
		renderMinTenth(new Date(2025, 5, 5))

		act(() => screen.getByLabelText('Previous month').focus())

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('keeps focus on the first enabled day on ArrowUp toward a disabled week, and leaves the header to Shift+Tab', async () => {
		const user = setupUser()

		renderMinTenth()

		act(() => day('10').focus())

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(day('10'))

		await user.tab({ shift: true })

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next month' }))
	})

	it('keeps focus on the min day when ArrowLeft meets a disabled day', async () => {
		const user = setupUser()

		renderMinTenth()

		act(() => day('10').focus())

		await user.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('keeps focus on the max day when ArrowRight meets a disabled day', async () => {
		const user = setupUser()

		renderMaxTwentieth()

		act(() => day('20').focus())

		await user.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(day('20'))
	})

	it('moves to the min day when ArrowUp meets a disabled day before min', async () => {
		const user = setupUser()

		renderMinTenth()

		act(() => day('12').focus())

		await user.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(day('10'))
	})

	it.each([
		['without a footer', false],
		['with a footer', true],
	])(
		'moves to the max day when ArrowDown meets a disabled day after max, %s',
		async (_name, footer) => {
			const user = setupUser()

			renderMaxTwentieth({ footer })

			act(() => day('18').focus())

			await user.keyboard('{ArrowDown}')

			expect(document.activeElement).toBe(day('20'))
		},
	)
})

// A calendar that no parent steers carries the date grid of the WAI-ARIA APG.
// An arrow that leaves the month steps the month, PageUp and PageDown step a
// month, and Shift with a Page key steps a year. June 2025 starts on a Sunday
// and has 30 days.
describe('Calendar keyboard month steps', () => {
	const day = (n: string) =>
		screen.getAllByRole('option').find((option) => option.textContent === n) as HTMLElement

	/** The header control that shows the month and opens the picker. */
	const monthLabel = () => screen.getByRole('button', { name: /^\w+ \d{4}$/ })

	/** The text of each enabled day that is a Tab stop. */
	const dayStops = () =>
		screen
			.getAllByRole('option')
			.filter((option) => option.tabIndex === 0 && !option.hasAttribute('disabled'))
			.map((option) => option.textContent)

	it('steps to the next month when ArrowRight leaves the last day', async () => {
		const onMonthChange = vi.fn()

		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} onMonthChange={onMonthChange} />)

		act(() => day('30').focus())

		await user.keyboard('{ArrowRight}')

		expect(monthLabel()).toHaveAccessibleName('July 2025')

		expect(document.activeElement).toHaveAccessibleName('Tuesday, July 1, 2025')

		expect(onMonthChange).toHaveBeenCalledExactlyOnceWith(new Date(2025, 6, 1))
	})

	it('steps to the previous month when ArrowLeft leaves the first day', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('1').focus())

		await user.keyboard('{ArrowLeft}')

		expect(monthLabel()).toHaveAccessibleName('May 2025')

		expect(document.activeElement).toHaveAccessibleName('Saturday, May 31, 2025')
	})

	it('steps to the next month when ArrowDown leaves the last row', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('28').focus())

		await user.keyboard('{ArrowDown}')

		expect(monthLabel()).toHaveAccessibleName('July 2025')

		expect(document.activeElement).toHaveAccessibleName('Saturday, July 5, 2025')
	})

	it('steps to the previous month when ArrowUp leaves the top row', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('3').focus())

		await user.keyboard('{ArrowUp}')

		expect(monthLabel()).toHaveAccessibleName('May 2025')

		expect(document.activeElement).toHaveAccessibleName('Tuesday, May 27, 2025')
	})

	it('steps to the next month when ArrowDown leaves the bottom row above a footer', async () => {
		const footerRef = createRef<HTMLDivElement>()

		const user = setupUser()

		renderUI(
			<>
				<Calendar defaultValue={new Date(2025, 5, 15)} footerRef={footerRef} />
				<div ref={footerRef}>
					<button type="button">Clear</button>
				</div>
			</>,
		)

		act(() => day('28').focus())

		await user.keyboard('{ArrowDown}')

		expect(monthLabel()).toHaveAccessibleName('July 2025')

		expect(document.activeElement).toHaveAccessibleName('Saturday, July 5, 2025')
	})

	it('steps a month with PageDown and PageUp, and a year with Shift', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('15').focus())

		await user.keyboard('{PageDown}')

		expect(document.activeElement).toHaveAccessibleName('Tuesday, July 15, 2025')

		await user.keyboard('{PageUp}')

		expect(document.activeElement).toHaveAccessibleName('Sunday, June 15, 2025')

		await user.keyboard('{Shift>}{PageDown}{/Shift}')

		expect(document.activeElement).toHaveAccessibleName('Monday, June 15, 2026')

		await user.keyboard('{Shift>}{PageUp}{/Shift}')

		expect(document.activeElement).toHaveAccessibleName('Sunday, June 15, 2025')
	})

	it('keeps a Page step inside a shorter month', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 0, 31)} />)

		act(() => day('31').focus())

		await user.keyboard('{PageDown}')

		expect(document.activeElement).toHaveAccessibleName('Friday, February 28, 2025')
	})

	it.each(['PageUp', 'PageDown'])('prevents the page scroll of %s', (key) => {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('15').focus())

		expect(fireEvent.keyDown(day('15'), { key })).toBe(false)
	})

	it('keeps the focused day inside min and max', async () => {
		const user = setupUser()

		renderUI(
			<Calendar
				defaultValue={new Date(2025, 5, 15)}
				min={new Date(2025, 5, 10)}
				max={new Date(2025, 5, 30)}
			/>,
		)

		act(() => day('30').focus())

		await user.keyboard('{ArrowRight}')

		expect(monthLabel()).toHaveAccessibleName('June 2025')

		expect(document.activeElement).toBe(day('30'))

		await user.keyboard('{PageUp}')

		expect(document.activeElement).toBe(day('10'))
	})

	it('holds one Tab stop, on the focused day, after a month step', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => day('30').focus())

		await user.keyboard('{ArrowRight}')

		expect(monthLabel()).toHaveAccessibleName('July 2025')

		expect(dayStops()).toEqual(['1'])

		expect(document.activeElement).toBe(day('1'))
	})

	it('leaves the Page keys to a parent that steers active', () => {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} active={null} />)

		act(() => day('15').focus())

		expect(fireEvent.keyDown(day('15'), { key: 'PageDown' })).toBe(true)

		expect(monthLabel()).toHaveAccessibleName('June 2025')
	})
})

// The day listbox is one Tab stop. The month header holds plain buttons, and
// each one is a Tab stop.
describe('Calendar Tab stops', () => {
	/** The text of each enabled day that is a Tab stop. */
	const dayStops = () =>
		screen
			.getAllByRole('option')
			.filter((option) => option.tabIndex === 0 && !option.hasAttribute('disabled'))
			.map((option) => option.textContent)

	it('holds one Tab stop in the day listbox, on the selected day before an earlier today', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(new Date(2025, 5, 10, 12))

			renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

			expect(dayStops()).toEqual(['15'])
		})
	})

	it('seats the day Tab stop on today when no day is selected', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(new Date(2025, 5, 20, 12))

			renderUI(<Calendar />)

			expect(dayStops()).toEqual(['20'])
		})
	})

	it('seats the day Tab stop on the first enabled day when today is out of range', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(new Date(2025, 5, 5, 12))

			renderUI(<Calendar min={new Date(2025, 5, 10)} />)

			expect(dayStops()).toEqual(['10'])
		})
	})

	it('seats one day Tab stop again after the month changes', async () => {
		await withFakeTime(async (clock) => {
			vi.setSystemTime(new Date(2025, 5, 20, 12))

			renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

			await clock.user.click(screen.getByLabelText('Next month'))

			expect(screen.getByRole('button', { name: /July 2025/ })).toBeInTheDocument()

			expect(dayStops()).toEqual(['1'])
		})
	})

	it('keeps the month header controls as plain buttons, each a Tab stop', () => {
		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()

		const controls = [
			screen.getByRole('button', { name: 'Previous month' }),
			screen.getByRole('button', { name: /June 2025/ }),
			screen.getByRole('button', { name: 'Next month' }),
		]

		expect(controls.map((control) => control.tabIndex)).toEqual([0, 0, 0])
	})

	it('enters on the roved day with header ArrowDown, as Tab does', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => screen.getByRole('option', { name: 'Sunday, June 15, 2025' }).focus())

		await user.keyboard('{ArrowRight}')

		const roved = screen.getByRole('option', { name: 'Monday, June 16, 2025' })

		expect(dayStops()).toEqual(['16'])

		await user.tab({ shift: true })

		await user.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(roved)
	})

	it('reaches the month header with Shift+Tab from the day listbox', async () => {
		const user = setupUser()

		renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

		act(() => screen.getByRole('option', { name: 'Sunday, June 15, 2025' }).focus())

		await user.tab({ shift: true })

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next month' }))
	})
})

describe('Calendar entry date', () => {
	// The clock of each case: midday on 15 June 2025.
	const now = new Date(2025, 5, 15, 12)

	const dayStops = () =>
		screen
			.getAllByRole('option')
			.filter((option) => option.tabIndex === 0 && !option.hasAttribute('disabled'))
			.map((option) => option.textContent)

	// The handle gives the entry day, and the grid holds its Tab stop on the same day.
	// After a month step, the roving hook moves the Tab stop in a microtask, so a
	// case that steps the month awaits its `act`.
	function expectEntry(ref: { current: CalendarHandle | null }, expected: Date | null) {
		expect(ref.current?.getEntryDate()).toEqual(expected)

		expect(dayStops()).toEqual(expected ? [String(expected.getDate())] : [])
	}

	it('enters on the selected day of the shown month', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(<Calendar ref={ref} value={new Date(2025, 5, 20)} />)

			expectEntry(ref, new Date(2025, 5, 20))
		})
	})

	it('enters on today when the shown month holds no selected day', async () => {
		await withFakeTime(async () => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(<Calendar ref={ref} defaultValue={new Date(2025, 4, 20)} />)

			await act(async () => ref.current?.nextMonth())

			expectEntry(ref, new Date(2025, 5, 15))
		})
	})

	it('enters on min when min is in the middle of the shown month', async () => {
		await withFakeTime(async () => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(
				<Calendar ref={ref} defaultValue={new Date(2025, 1, 20)} min={new Date(2025, 2, 10)} />,
			)

			await act(async () => ref.current?.nextMonth())

			expectEntry(ref, new Date(2025, 2, 10))
		})
	})

	it('enters on the first enabled day when today is disabled', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(<Calendar ref={ref} max={new Date(2025, 5, 10)} />)

			expectEntry(ref, new Date(2025, 5, 1))
		})
	})

	it('enters on today when the selected day is disabled', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(<Calendar ref={ref} value={new Date(2025, 5, 20)} max={new Date(2025, 5, 18)} />)

			expectEntry(ref, new Date(2025, 5, 15))
		})
	})

	it('gives null when the shown month holds no enabled day', async () => {
		await withFakeTime(async () => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(<Calendar ref={ref} value={new Date(2025, 5, 15)} max={new Date(2025, 5, 30)} />)

			await act(async () => ref.current?.nextMonth())

			expect(screen.getByRole('listbox', { name: 'July 2025' })).toBeInTheDocument()

			expectEntry(ref, null)
		})
	})

	it('enters a range on the earlier endpoint of the shown month', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			// The start comes after the end, so the earlier endpoint is the end.
			renderUI(
				<CalendarRange
					ref={ref}
					rangeStart={new Date(2025, 5, 20)}
					rangeEnd={new Date(2025, 5, 10)}
				/>,
			)

			expectEntry(ref, new Date(2025, 5, 10))
		})
	})

	it('enters a range on its endpoint in the shown month', async () => {
		await withFakeTime(async () => {
			vi.setSystemTime(now)

			const ref = createRef<CalendarHandle>()

			renderUI(
				<CalendarRange
					ref={ref}
					rangeStart={new Date(2025, 4, 20)}
					rangeEnd={new Date(2025, 5, 25)}
				/>,
			)

			await act(async () => ref.current?.nextMonth())

			expectEntry(ref, new Date(2025, 5, 25))
		})
	})
})

describe('Calendar + Form', () => {
	it('seeds the selected day from Form.defaultValues', () => {
		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }}>
				<Calendar name="date" />
			</Form>,
		)

		expect(selectedDay()?.textContent).toBe('15')
	})

	it('writes the picked day back to the bound field on submit', async () => {
		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }} onSubmit={onSubmit}>
				<Calendar name="date" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = setupUser()

		const day20 = screen.getAllByRole('option').find((o) => o.textContent === '20')

		await user.click(day20 as HTMLElement)

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		const submitted = onSubmit.mock.calls[0]?.[0].date as Date

		expect(submitted.getFullYear()).toBe(2025)

		expect(submitted.getMonth()).toBe(5)

		expect(submitted.getDate()).toBe(20)
	})

	it('lets an explicit value prop override the bound field', () => {
		renderUI(
			<Form defaultValues={{ date: new Date(2025, 5, 15) }}>
				<Calendar name="date" value={new Date(2025, 5, 20)} onValueChange={() => {}} />
			</Form>,
		)

		expect(selectedDay()?.textContent).toBe('20')
	})

	// The binding cascade ignores `defaultValue` for a controlled or a bound
	// calendar. With no value, such a calendar takes the month of the clock.
	const ignoredSeed = new Date(2020, 0, 15)

	describe.each([
		['a controlled null value', () => <Calendar value={null} defaultValue={ignoredSeed} />],
		[
			'a bound field with no value',
			() => (
				<Form defaultValues={{ date: null }}>
					<Calendar name="date" defaultValue={ignoredSeed} />
				</Form>
			),
		],
	])('with %s', (_, calendar) => {
		it('shows the month of the clock, not the month of defaultValue', async () => {
			await withFakeTime(() => {
				vi.setSystemTime(new Date(2025, 5, 15, 12))

				renderUI(calendar())

				expect(screen.getByRole('listbox', { name: 'June 2025' })).toBeInTheDocument()

				expect(selectedDay()).toBeUndefined()
			})
		})

		it('holds the month back in the server markup', () => {
			const html = renderToString(calendar())

			expect(html).toContain('aria-label="Previous month"')

			expect(html).not.toContain('2020')

			expect(html).not.toContain('role="option"')
		})
	})
})

describe('Calendar onMonthChange', () => {
	const june = new Date(2025, 5, 15)

	it('reports the first of the month the header arrows move to', async () => {
		const user = setupUser()

		const onMonthChange = vi.fn()

		renderUI(<Calendar defaultValue={june} onMonthChange={onMonthChange} />)

		// A calendar mounts on a month; that is the rest state, not a transition.
		expect(onMonthChange).not.toHaveBeenCalled()

		await user.click(screen.getByLabelText('Next month'))

		expect(onMonthChange).toHaveBeenCalledExactlyOnceWith(new Date(2025, 6, 1))

		await user.click(screen.getByLabelText('Previous month'))

		expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2025, 5, 1))

		expect(onMonthChange).toHaveBeenCalledTimes(2)
	})

	// The value re-anchors the view during render, through a different writer
	// than the arrows. The report reads the committed month, so both arrive.
	it('reports a value that lands in another month', () => {
		const onMonthChange = vi.fn()

		const { rerender } = renderUI(<Calendar value={june} onMonthChange={onMonthChange} />)

		rerender(<Calendar value={new Date(2025, 8, 2)} onMonthChange={onMonthChange} />)

		expect(onMonthChange).toHaveBeenCalledExactlyOnceWith(new Date(2025, 8, 1))
	})

	it('says nothing for a value that stays inside the rendered month', () => {
		const onMonthChange = vi.fn()

		const { rerender } = renderUI(<Calendar value={june} onMonthChange={onMonthChange} />)

		rerender(<Calendar value={new Date(2025, 5, 28)} onMonthChange={onMonthChange} />)

		expect(onMonthChange).not.toHaveBeenCalled()
	})

	it('reports the month the picker navigates to', async () => {
		const user = setupUser()

		const onMonthChange = vi.fn()

		renderUI(<Calendar defaultValue={june} onMonthChange={onMonthChange} />)

		await user.click(screen.getByRole('button', { name: /June 2025/ }))

		await user.click(screen.getByRole('option', { name: 'Sep' }))

		expect(onMonthChange).toHaveBeenCalledExactlyOnceWith(new Date(2025, 8, 1))
	})
})

// The suite pins the zone to UTC, so local midnight is 00:00 UTC. June 2025
// holds each day that these cases pass, so the grid stays on one month.
describe('Calendar today', () => {
	const todayCell = () =>
		screen.getAllByRole('option').find((option) => option.hasAttribute('aria-current'))

	/** Tells the page that the reader shows it again, as a browser does for a tab. */
	function showPage() {
		act(() => {
			document.dispatchEvent(new Event('visibilitychange'))
		})
	}

	it('moves the today mark to the next day at local midnight', async () => {
		await withFakeTime(async (clock) => {
			vi.setSystemTime(new Date(2025, 5, 15, 23, 59, 30))

			renderUI(<Calendar />)

			expect(todayCell()).toHaveTextContent(/^15$/)

			await clock.advance(30_000)

			expect(todayCell()).toHaveTextContent(/^16$/)
		})
	})

	it('moves the today mark when the page shows again after a missed midnight', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(new Date(2025, 5, 15, 12))

			renderUI(<Calendar />)

			// A browser holds the timers of a hidden tab. The clock moves past
			// midnight, and the midnight timer does not run.
			vi.setSystemTime(new Date(2025, 5, 16, 9))

			showPage()

			expect(todayCell()).toHaveTextContent(/^16$/)
		})
	})

	it('commits nothing when the page shows again on the same day', async () => {
		await withFakeTime(() => {
			vi.setSystemTime(new Date(2025, 5, 15, 9))

			const onRender = vi.fn()

			renderUI(
				<Profiler id="calendar" onRender={onRender}>
					<Calendar />
				</Profiler>,
			)

			vi.setSystemTime(new Date(2025, 5, 15, 21))

			showPage()

			expect(onRender).toHaveBeenCalledOnce()
		})
	})

	it('marks the new month in the month picker after a month boundary', async () => {
		await withFakeTime(async (clock) => {
			vi.setSystemTime(new Date(2025, 5, 30, 23, 59))

			renderUI(<Calendar />)

			await clock.advance(60_000)

			// The view stays on the month that the reader looks at.
			await clock.user.click(screen.getByRole('button', { name: /June 2025/ }))

			expect(screen.getByRole('option', { name: 'Jul' })).toHaveAttribute('aria-current', 'date')

			expect(screen.getByRole('option', { name: 'Jun' })).not.toHaveAttribute('aria-current')
		})
	})
})
