'use client'

import {
	type KeyboardEvent,
	type Ref,
	type RefObject,
	useCallback,
	useEffect,
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
import type { ButtonVariants } from '../button'
import { useFormValue } from '../form/use-form-value'
import { CalendarGrid } from './calendar-grid'
import { CalendarHeader } from './calendar-header'
import {
	getCalendarDays,
	getFirstDayColumn,
	getMonthLabels,
	getWeekdayLabels,
	isBeforeDay,
	resolveLocale,
} from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'
import { useCalendarMonth } from './use-calendar-month'

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
	footerKeyDown: (e: KeyboardEvent) => void
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
	/** Binds the selected date to an enclosing Form field. `Form.defaultValues` should seed `Date | null`. */
	name?: string
	value?: Date | null
	defaultValue?: Date
	onValueChange?: (date: Date) => void
	min?: Date
	max?: Date
	/** Externally-driven roving-focus cell, letting a parent (e.g. DatePicker) steer focus across the header, grid, and footer zones. */
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	/** Per-cell decorator invoked for every day; returns selection, button variant/color, hover handlers, and classes. @see {@link CalendarDayProps} */
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
	/** Element holding the calendar's footer controls; lets roving focus extend into a parent-owned footer zone. */
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	/**
	 * BCP 47 locale tag driving the first day of the week and the weekday /
	 * month labels. Resolution order: explicit prop, then enclosing
	 * `LocaleProvider`, then the runtime default.
	 */
	locale?: string
	/**
	 * Size step that drives overall width, padding, and the weekday label size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 * Re-broadcast to descendants via the Density context; nav buttons and day
	 * cells inherit the resolved size consistently.
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
 * Client component (`'use client'`). "Today" is resolved after mount only, so
 * a server-rendered today can never mismatch the client across a day boundary
 * or timezone offset. Use {@link CalendarRange} for two-endpoint selection.
 */
export function Calendar({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
	active,
	onPickerOpenChange,
	getDayProps,
	footerRef,
	ref,
	locale,
	size,
	className,
}: CalendarProps) {
	const inherited = useDensity()

	const resolvedSize: Step = size ?? inherited.size

	const ambient = useLocale()

	const localeTag = resolveLocale(locale ?? ambient.locale)

	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue) onValueChange?.(nextValue)
		},
		[onValueChange],
	)

	// Binds the selected date to an enclosing Form field by `name` (value-typed
	// cascade); falls back to controlled/uncontrolled state. No invalid wiring:
	// a bare Calendar has no Control/error surface (it gains one inside
	// DatePicker, which binds separately).
	const { value, setValue, setTouched } = useFormValue<Date>(name, {
		value: valueProp,
		defaultValue,
		onValueChange: handleValueChange,
	})

	// Populated after mount only; a server-rendered "today" can mismatch the
	// client across a day boundary or timezone offset. Null until then.
	const [today, setToday] = useState<Date | null>(null)

	useEffect(() => {
		setToday(new Date())
	}, [])

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	const { viewDate, year, month, prevMonth, nextMonth, navigateTo } = useCalendarMonth({
		value,
		defaultValue,
		activeGridDate,
	})

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const [pickerOpen, setPickerOpen] = useState(false)

	const handlePickerOpenChange = useCallback(
		(open: boolean) => {
			setPickerOpen(open)
			onPickerOpenChange?.(open)
		},
		[onPickerOpenChange],
	)

	const openPicker = useCallback(() => {
		handlePickerOpenChange(true)
	}, [handlePickerOpenChange])

	const isDisabled = useCallback(
		(date: Date) => {
			if (min && isBeforeDay(date, min)) return true
			if (max && isBeforeDay(max, date)) return true

			return false
		},
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

	const monthLabel = useMemo(
		() => viewDate.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
		[viewDate, localeTag],
	)

	// Month navigation (header chevrons, picker, arrowing across a boundary)
	// re-renders the grid silently; this announces the new view to screen
	// readers (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(monthLabel)

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
					monthLabel={monthLabel}
					monthLabels={monthLabels}
					pickerOpen={pickerOpen}
					onPickerOpenChange={handlePickerOpenChange}
					onPickerNavigate={navigateTo}
					onPrevMonth={prevMonth}
					onNextMonth={nextMonth}
				/>

				<CalendarGrid
					gridRef={gridRef}
					onGridKeyDown={handleGridKeyDown}
					size={resolvedSize}
					weekdays={weekdays}
					days={days}
					firstDayColumn={firstDayColumn}
					today={today}
					value={value}
					activeGridDate={activeGridDate}
					isDisabled={isDisabled}
					getDayProps={getDayProps}
					onSelect={handleSelect}
					monthLabel={monthLabel}
					localeTag={localeTag}
				/>
			</div>
		</Density>
	)
}
