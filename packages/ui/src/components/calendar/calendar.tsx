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
import { announce, cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Density, useDensity } from '../../primitives/density'
import { useLocale } from '../../providers/locale'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import type { ButtonVariants } from '../button'
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

export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
	footerKeyDown: (e: KeyboardEvent) => void
}

export type CalendarDayContextValue = {
	date: Date
	disabled: boolean
	today: boolean
	selected: boolean
	active: boolean
}

export type CalendarDayProps = {
	selected?: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

export type CalendarProps = {
	value?: Date | null
	defaultValue?: Date
	onValueChange?: (date: Date) => void
	min?: Date
	max?: Date
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
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

/** Single-date month-grid picker — exposes navigation, focus, and picker handles to a parent via `ref` for embedded use. */
export function Calendar({
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

	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onValueChange: handleValueChange,
	})

	// Populated after mount only, avoiding a server/client mismatch on "today"
	// (e.g. across a day boundary or timezone offset). Null until then.
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
		},
		[setValue],
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
	// re-renders the grid silently; mirror the new view through the announcer
	// so screen readers hear where they landed (WCAG 4.1.3). Skips mount.
	const announcedMonthLabel = useRef(monthLabel)

	useEffect(() => {
		if (announcedMonthLabel.current === monthLabel) return

		announcedMonthLabel.current = monthLabel

		announce(monthLabel)
	}, [monthLabel])

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
