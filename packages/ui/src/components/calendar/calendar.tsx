'use client'

import {
	type KeyboardEvent,
	type Ref,
	type RefObject,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { type ScaleStep, snapToScale } from '../../core/density'
import { useA11yAnnouncements } from '../../hooks'
import { useDensityStep } from '../../primitives/density'
import { useLocale } from '../../providers/locale'
import { k, scale } from '../../recipes/kata/calendar'
import { Box } from '../../structure/box'
import { resolveLocale } from '../../utilities'
import type { ButtonVariants } from '../button'
import { useFormValue } from '../form/use-form-value'
import { CalendarGrid } from './calendar-grid'
import { CalendarHeader } from './calendar-header'
import {
	formatMonthName,
	getCalendarDays,
	getFirstDayColumn,
	getMonthLabels,
	getWeekdayLabels,
	isDayInRange,
	isSameDay,
} from './calendar-utilities'
import { dayTabStop, useCalendarFocus } from './use-calendar-focus'
import { useCalendarMonth } from './use-calendar-month'
import { useCalendarToday } from './use-calendar-today'

/** The day cells of a calendar that shows no month yet. @internal */
const NO_DAYS: Date[] = []

/** Identifies the currently active (roving-focus) cell across the calendar's header, grid, or footer zones. */
export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

/** Imperative handle exposed via {@link Calendar}'s `ref`: month navigation, the entry day of the day grid, picker, and footer key routing for parent-driven control. */
export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
	/**
	 * Runs the footer key handler of the calendar: the arrow keys move focus
	 * between the footer buttons and into the day grid. It does nothing while
	 * the parent steers the calendar (`active` is set), because the parent then
	 * owns the footer keys.
	 */
	footerKeyDown: (event: KeyboardEvent) => void
	/**
	 * The day where the focus enters the day grid of the shown month, as local
	 * midnight. It is the day that holds the Tab stop of the grid: the selected
	 * day when it is enabled, else today when it is enabled and in the month,
	 * else the first enabled day. When `getDayProps` selects more than one day,
	 * as {@link CalendarRange} does, the selected day is the earliest of them in
	 * the month. A parent that moves its own highlight into the grid reads it,
	 * because the month buttons, the month picker, and the Page keys can move
	 * the shown month away from the value.
	 *
	 * @returns The day, or `null` when the shown month holds no enabled day.
	 */
	getEntryDate: () => Date | null
}

/** Per-day state passed to a {@link CalendarProps.getDayProps} callback so it can style or decorate individual cells. */
export type CalendarDayContextValue = {
	date: Date
	disabled: boolean
	today: boolean
	selected: boolean
	active: boolean
}

/** Per-day overrides returned from {@link CalendarProps.getDayProps}: selection, button variant/color, hover handlers, and classes. */
export type CalendarDayProps = {
	selected?: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

/** Props for {@link Calendar}: value binding, range bounds, locale/size, the `getDayProps` cell hook, and the imperative `ref`. */
export type CalendarProps = {
	/** Binds the selected date to an enclosing Form field. `Form.defaultValues` must seed `Date | null`. */
	name?: string
	/**
	 * The selected date of a controlled calendar. `null` selects no day.
	 *
	 * @remarks The calendar reads the day of the date in the time zone of the
	 * side that renders it. The server markup shows the month of the date. On a
	 * page that renders on a server, build the date from local parts
	 * (`new Date(year, monthIndex, day)`), so the two sides read the same day.
	 * An ISO date such as `new Date('2025-07-01')` is midnight in UTC, which is
	 * the day before in a zone west of UTC.
	 */
	value?: Date | null
	/**
	 * The initially selected date of an uncontrolled calendar. It also seeds the
	 * month that the calendar shows first. A controlled or a bound calendar
	 * ignores it. With no value, such a calendar shows the month of the clock.
	 *
	 * @remarks As for `value`, build the date from local parts on a page that
	 * renders on a server.
	 */
	defaultValue?: Date
	onValueChange?: (value: Date | null) => void
	min?: Date
	max?: Date
	/**
	 * The cell that a parent, such as DatePicker, highlights. A parent that sets
	 * it steers the calendar and owns the keys of the header, the grid, and the
	 * footer. The calendar then moves no focus for these keys and calls no
	 * `preventDefault`. The parent also owns the month steps and the Page keys,
	 * and passes `null` while no cell is active. Leave it unset, and the calendar
	 * moves the focus itself, and the day grid steps the month.
	 */
	active?: CalendarActive | null
	/**
	 * Fires with the first of the month the grid renders, whenever that month
	 * changes.
	 *
	 * The calendar owns the rendered month outright, and `onValueChange` reports a
	 * selection rather than a view. A consumer that fetches per-month data therefore
	 * had to reverse-derive the month from `getDayProps` calls. The header arrows, the
	 * month and year pickers, keyboard roving across a month edge, and a `value`
	 * that lands elsewhere all report here. Mounting reports nothing. That
	 * includes the month that a calendar with no seed date shows after
	 * hydration.
	 */
	onMonthChange?: (month: Date) => void
	/** Per-cell decorator invoked for every day; returns selection, button variant/color, hover handlers, and classes. @see {@link CalendarDayProps} */
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
	/**
	 * Element that holds the footer controls of the calendar, in a zone that the
	 * parent owns. The day grid reaches the footer by Tab, not by an arrow. When
	 * a parent steers `active`, the parent owns the arrow keys of the footer too.
	 */
	footerRef?: RefObject<HTMLElement | null>
	/**
	 * Id for the day `role="listbox"`, so a parent that keeps DOM focus on its
	 * own input (e.g. DatePicker `input` mode) can point that input's
	 * `aria-controls` at the grid the roving cursor moves through.
	 */
	listboxId?: string
	/**
	 * Id stamped on the active grid cell. A parent that keeps DOM focus on its
	 * own input can point that input's `aria-activedescendant` at the roved day.
	 * That is the active-descendant pattern; it pairs with `active` and `listboxId`.
	 */
	activeDescendantId?: string
	/**
	 * Marks the day listbox `aria-multiselectable`. Set it when `getDayProps`
	 * selects more than one day, as {@link CalendarRange} does for its two
	 * endpoints.
	 * @defaultValue false
	 */
	multiselectable?: boolean
	ref?: Ref<CalendarHandle>
	/**
	 * BCP 47 locale tag driving the first day of the week and the weekday /
	 * month labels. The labels name Gregorian months and years, as the grid
	 * does, also for a locale that defaults to another calendar. Resolution
	 * order: explicit prop, then enclosing `LocaleProvider`, then the runtime
	 * default.
	 *
	 * The runtime default is the default of the side that renders. The server
	 * and the browser can have different defaults, and the server markup holds
	 * the weekday row. On a page that renders on a server, set `locale` or an
	 * enclosing `LocaleProvider`, so the two sides agree.
	 *
	 * @defaultValue enclosing `LocaleProvider` locale, else the runtime default.
	 */
	locale?: string
	/**
	 * The density step of the width, the padding, and the weekday labels. Omit
	 * it to take the step of the nearest density scope. A step makes the calendar
	 * a density scope, so the navigation buttons and the day cells take the step
	 * too. `sm` is the smallest step: `xs` renders as `sm`.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
}

/**
 * Single-date month-grid picker. Binds to an enclosing Form field by `name`
 * (value-typed cascade) or falls back to controlled/uncontrolled `value`;
 * `min`/`max` bound the selectable range. Resolves `locale` against an
 * enclosing Locale provider. The header, grid, and day cells take the step of
 * the nearest density scope, and a set `size` makes the calendar that scope.
 * `sm` is the smallest step. At `xs`, set or inherited, the calendar opens a
 * scope at `sm`.
 * When a parent steers `active`, the parent owns the keys of the header, the
 * grid, and the footer, and the calendar moves no focus for them. Tab still
 * reaches each header button and the one Tab stop of the grid. Month changes
 * are announced to screen readers (WCAG 4.1.3). Exposes navigation and picker
 * control to a parent via the {@link CalendarHandle} `ref` for embedded use
 * (e.g. DatePicker).
 *
 * With no `active`, the day grid follows the WAI-ARIA APG date grid. An arrow
 * that leaves the month steps the month. That includes ArrowUp on the top row
 * and ArrowDown on the bottom row. PageUp and PageDown step a month, and Shift
 * with a Page key steps a year. Home and End go to the first and the last
 * enabled day of the shown month. ArrowDown from the header enters the grid
 * on its Tab stop, as Tab does. After a rove, that is the roved day. Else it
 * is the selected day, else today, else the first enabled day.
 *
 * The focused day stays between `min` and `max`. An arrow or a Page key toward
 * a disabled day moves the focus to the nearest enabled day. When that is the
 * focused day, the focus stays. Thus the arrows never leave the day grid, and
 * they never wrap. Tab and Shift+Tab reach the header and the footer.
 *
 * @remarks
 * Client component (`'use client'`). "Today" waits for hydration, so a
 * server-rendered today can never mismatch the client across a day boundary
 * or timezone offset. It moves to the new day at local midnight. Use
 * {@link CalendarRange} for two-endpoint selection.
 *
 * With no seed date, the month waits for hydration too. The seed is the
 * selected date, or the `defaultValue` of an uncontrolled, unbound calendar.
 * The server and the hydration render draw the header and the weekday row,
 * with no month label and no days. The month of the client clock follows in
 * the next render, and it reports and announces nothing. A client-only mount,
 * such as a DatePicker popover, shows the month in its first render.
 *
 * The locale and a seeded month do not wait for hydration. On a page that
 * renders on a server, set `locale` or a `LocaleProvider`, and build the seed
 * from local parts. Then the two sides agree. See `locale` and `value`.
 */
export function Calendar({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	active,
	onMonthChange,
	getDayProps,
	footerRef,
	listboxId,
	activeDescendantId,
	multiselectable,
	ref,
	locale,
	size,
	className,
}: CalendarProps) {
	const ambient = useLocale()

	// The width has no `xs` value, so at `xs` the buttons and the cells would
	// shrink inside the `sm` width. A step off the scale makes the calendar a
	// scope at the nearest step of the scale. Only a `size` or a scope sets such
	// a step, and the server reads both, so the server and the client agree on
	// the scope.
	const step = useDensityStep(size)

	const snapped = snapToScale(step, scale)

	const density = snapped === step ? size : snapped

	const localeTag = resolveLocale(locale ?? ambient.locale)

	// Binds the selected date to an enclosing Form field by `name` (value-typed
	// cascade); falls back to controlled/uncontrolled state. No invalid wiring:
	// a bare Calendar has no Control/error surface (it gains one inside
	// DatePicker, which binds separately).
	const { value, setValue, setTouched } = useFormValue<Date>(name, {
		value: valueProp,
		defaultValue,
		onValueChange,
	})

	// The day is null until hydration, and it moves at each local midnight.
	const today = useCalendarToday()

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	// The view seeds from the resolved `value`. The binding cascade of
	// `useFormValue` gives `defaultValue` to an uncontrolled, unbound calendar
	// only, so a controlled or a bound calendar with no value takes the month of
	// the clock, and that month waits for hydration.
	const { viewDate, year, month, shown, prevMonth, nextMonth, navigateTo } = useCalendarMonth({
		value,
		activeGridDate,
		onMonthChange,
	})

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const [pickerOpen, setPickerOpen] = useState(false)

	const openPicker = useCallback(() => {
		setPickerOpen(true)
	}, [])

	const isDisabled = useCallback((date: Date) => !isDayInRange(date, min, max), [min, max])

	const headerRef = useRef<HTMLDivElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)

	// A calendar that no parent steers carries the date model of its day grid. A
	// parent that steers `active` owns the keys of the header, the grid, and the
	// footer, the month steps, and the Page keys.
	const steered = active !== undefined

	const dayGrid = useMemo(
		() => (steered ? undefined : { days, min, max, navigateTo }),
		[steered, days, min, max, navigateTo],
	)

	const { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown } = useCalendarFocus({
		headerRef,
		gridRef,
		footerRef,
		steered,
		dayGrid,
	})

	// A day is selected as the grid marks it: `getDayProps` can override the
	// match with `value`, as a range does for its two endpoints.
	const isSelected = useCallback(
		(date: Date) => {
			const selected = value != null && isSameDay(date, value)

			const dayProps = getDayProps?.({
				date,
				disabled: isDisabled(date),
				today: today != null && isSameDay(date, today),
				selected,
				active: activeGridDate != null && isSameDay(date, activeGridDate),
			})

			return dayProps?.selected ?? selected
		},
		[value, getDayProps, isDisabled, today, activeGridDate],
	)

	useImperativeHandle(
		ref,
		() => ({
			prevMonth,
			nextMonth,
			openPicker,
			footerKeyDown: handleFooterKeyDown,
			// A month that waits for hydration draws no day, so it holds no entry.
			getEntryDate: () => (shown ? dayTabStop(days, today, isDisabled, isSelected) : null),
		}),
		[
			prevMonth,
			nextMonth,
			openPicker,
			handleFooterKeyDown,
			shown,
			days,
			today,
			isDisabled,
			isSelected,
		],
	)

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)

			// Selecting a day is the field's interaction point — mark it touched
			// (no-op outside a Form) so validateOn="touched" rules can fire.
			setTouched()
		},
		[setValue, setTouched],
	)

	const weekdays = useMemo(() => getWeekdayLabels(localeTag), [localeTag])

	const monthLabels = useMemo(() => getMonthLabels(localeTag), [localeTag])

	const firstDayColumn = useMemo(
		() => getFirstDayColumn(year, month, localeTag),
		[year, month, localeTag],
	)

	const monthLabel = useMemo(() => formatMonthName(viewDate, localeTag), [viewDate, localeTag])

	// Month navigation (header chevrons, picker, arrowing across a boundary)
	// re-renders the grid silently; this announces the new view to screen
	// readers (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(monthLabel)

	// A clock-seeded calendar draws no month on the server or in the hydration
	// render, so the two agree. The announcement above reads the month in state,
	// which stays the same when the markup shows it.
	const shownLabel = shown ? monthLabel : ''

	const shownDays = shown ? days : NO_DAYS

	const headerActiveIndex = active?.zone === 'header' ? active.index : null

	return (
		<Box data-slot="calendar" density={density} className={cn(k.base, className)}>
			<CalendarHeader
				headerRef={headerRef}
				onHeaderKeyDown={handleHeaderKeyDown}
				activeIndex={headerActiveIndex}
				year={year}
				month={month}
				today={today}
				monthLabel={shownLabel}
				monthLabels={monthLabels}
				localeTag={localeTag}
				pickerOpen={pickerOpen}
				onPickerOpenChange={setPickerOpen}
				onPickerNavigate={navigateTo}
				onPrevMonth={prevMonth}
				onNextMonth={nextMonth}
			/>

			<CalendarGrid
				gridRef={gridRef}
				onGridKeyDown={handleGridKeyDown}
				weekdays={weekdays}
				days={shownDays}
				firstDayColumn={firstDayColumn}
				today={today}
				value={value}
				activeGridDate={activeGridDate}
				isDisabled={isDisabled}
				getDayProps={getDayProps}
				onSelect={handleSelect}
				monthLabel={shownLabel}
				localeTag={localeTag}
				listboxId={listboxId}
				activeDescendantId={activeDescendantId}
				multiselectable={multiselectable}
			/>
		</Box>
	)
}
