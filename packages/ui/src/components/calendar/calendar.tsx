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
import { useA11yAnnouncements } from '../../hooks'
import { Density, useDensity } from '../../primitives/density'
import { useLocale } from '../../providers/locale'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
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
	isBeforeDay,
} from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'
import { useCalendarMonth } from './use-calendar-month'
import { useCalendarToday } from './use-calendar-today'

/** The day cells of a calendar that shows no month yet. @internal */
const NO_DAYS: Date[] = []

/** Identifies the currently active (roving-focus) cell across the calendar's header, grid, or footer zones. */
export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

/** Imperative handle exposed via {@link Calendar}'s `ref`: month navigation, picker, and footer key routing for parent-driven control. */
export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
	footerKeyDown: (event: KeyboardEvent) => void
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
	value?: Date | null
	defaultValue?: Date
	onValueChange?: (value: Date | null) => void
	min?: Date
	max?: Date
	/** Externally-driven roving-focus cell, letting a parent (e.g. DatePicker) steer focus across the header, grid, and footer zones. */
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
	 * includes the month that a calendar with no `value` and no `defaultValue`
	 * shows after hydration.
	 */
	onMonthChange?: (month: Date) => void
	/** Per-cell decorator invoked for every day; returns selection, button variant/color, hover handlers, and classes. @see {@link CalendarDayProps} */
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
	/** Element holding the calendar's footer controls; lets roving focus extend into a parent-owned footer zone. */
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
	ref?: Ref<CalendarHandle>
	/**
	 * BCP 47 locale tag driving the first day of the week and the weekday /
	 * month labels. The labels name Gregorian months and years, as the grid
	 * does, also for a locale that defaults to another calendar. Resolution
	 * order: explicit prop, then enclosing `LocaleProvider`, then the runtime
	 * default.
	 *
	 * @defaultValue enclosing `LocaleProvider` locale, else the runtime default
	 */
	locale?: string
	/**
	 * Size step that drives overall width, padding, and the weekday label size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 * Re-broadcast to descendants via the Density context; nav buttons and day
	 * cells inherit the resolved size consistently.
	 *
	 * @defaultValue enclosing Density size, else `'md'`
	 */
	size?: Step
	className?: string
}

/**
 * Single-date month-grid picker. Binds to an enclosing Form field by `name`
 * (value-typed cascade) or falls back to controlled/uncontrolled `value`;
 * `min`/`max` bound the selectable range. Resolves `size` and `locale` against
 * enclosing Density and Locale providers, re-broadcasting the size to the
 * header, grid, and day cells. Roving focus spans header, grid, and footer
 * zones (tracked via `active`), and month changes are announced to screen
 * readers (WCAG 4.1.3). Exposes navigation and picker control to a parent via
 * the {@link CalendarHandle} `ref` for embedded use (e.g. DatePicker).
 *
 * @remarks
 * Client component (`'use client'`). "Today" waits for hydration, so a
 * server-rendered today can never mismatch the client across a day boundary
 * or timezone offset. It moves to the new day at local midnight. Use
 * {@link CalendarRange} for two-endpoint selection.
 *
 * With no `value` and no `defaultValue`, the month waits for hydration too.
 * The server and the hydration render draw the header and the weekday row,
 * with no month label and no days. The month of the client clock follows in
 * the next render, and it reports and announces nothing. A client-only mount,
 * such as a DatePicker popover, shows the month in its first render.
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
	ref,
	locale,
	size,
	className,
}: CalendarProps) {
	const inherited = useDensity()

	const resolvedSize: Step = size ?? inherited.size

	const ambient = useLocale()

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

	const { viewDate, year, month, shown, prevMonth, nextMonth, navigateTo } = useCalendarMonth({
		value,
		defaultValue,
		activeGridDate,
		onMonthChange,
	})

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const [pickerOpen, setPickerOpen] = useState(false)

	const openPicker = useCallback(() => {
		setPickerOpen(true)
	}, [])

	const isDisabled = useCallback(
		(date: Date) =>
			(min !== undefined && isBeforeDay(date, min)) ||
			(max !== undefined && isBeforeDay(max, date)),
		[min, max],
	)

	const headerRef = useRef<HTMLDivElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)

	const { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown } = useCalendarFocus({
		headerRef,
		gridRef,
		footerRef,
	})

	useImperativeHandle(
		ref,
		() => ({ prevMonth, nextMonth, openPicker, footerKeyDown: handleFooterKeyDown }),
		[prevMonth, nextMonth, openPicker, handleFooterKeyDown],
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
		<Density scale={resolvedSize}>
			<div
				data-slot="calendar"
				data-size={resolvedSize}
				className={cn(k.base({ size: resolvedSize }), className)}
			>
				<CalendarHeader
					headerRef={headerRef}
					onHeaderKeyDown={handleHeaderKeyDown}
					size={resolvedSize}
					activeIndex={headerActiveIndex}
					year={year}
					month={month}
					today={today}
					monthLabel={shownLabel}
					monthLabels={monthLabels}
					pickerOpen={pickerOpen}
					onPickerOpenChange={setPickerOpen}
					onPickerNavigate={navigateTo}
					onPrevMonth={prevMonth}
					onNextMonth={nextMonth}
				/>

				<CalendarGrid
					gridRef={gridRef}
					onGridKeyDown={handleGridKeyDown}
					size={resolvedSize}
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
				/>
			</div>
		</Density>
	)
}
