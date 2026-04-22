'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	memo,
	type Ref,
	type RefObject,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Button, type ButtonVariants } from '../button'
import { CalendarPicker } from './calendar-picker'
import { useCalendarFocus } from './use-calendar-focus'
import { getCalendarDays, isBeforeDay, isSameDay, WEEKDAYS } from './utilities'
import { k } from './variants'

export type CalendarActive =
	| { zone: 'header'; index: 0 | 1 | 2 }
	| { zone: 'grid'; date: Date }
	| { zone: 'footer'; index: number }

export type CalendarHandle = {
	prevMonth: () => void
	nextMonth: () => void
	openPicker: () => void
	footerKeyDown: (e: React.KeyboardEvent) => void
}

export type CalendarDayContext = {
	date: Date
	disabled: boolean
	isToday: boolean
	isSelected: boolean
	isActive: boolean
}

export type CalendarDayProps = {
	selected?: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

type DayCellProps = {
	date: Date
	disabled: boolean
	isToday: boolean
	isActive: boolean
	selected: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	customClassName?: string
	gridColumnStart?: number
	onSelect: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

const DayCell = memo(function DayCell({
	date,
	disabled,
	isToday,
	isActive,
	selected,
	variant,
	color,
	customClassName,
	gridColumnStart,
	onSelect,
	onMouseEnter,
	onMouseLeave,
}: DayCellProps) {
	const handleClick = () => {
		if (!disabled) onSelect(date)
	}

	return (
		<Button
			variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
			color={color ?? (selected || isToday ? 'blue' : undefined)}
			aria-pressed={selected}
			disabled={disabled}
			onClick={handleClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={gridColumnStart ? { gridColumnStart } : undefined}
			className={cn(
				k.day.base,
				isActive && (selected ? k.day.activeSelected : k.day.active),
				customClassName,
			)}
		>
			{date.getDate()}
		</Button>
	)
})

export type CalendarProps = {
	value?: Date | null
	defaultValue?: Date
	onChange?: (date: Date) => void
	min?: Date
	max?: Date
	active?: CalendarActive | null
	onPickerOpenChange?: (open: boolean) => void
	getDayProps?: (ctx: CalendarDayContext) => CalendarDayProps
	footerRef?: RefObject<HTMLElement | null>
	ref?: Ref<CalendarHandle>
	className?: string
}

export function Calendar({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	active,
	onPickerOpenChange,
	getDayProps,
	footerRef,
	ref,
	className,
}: CalendarProps) {
	const handleValueChange = useCallback(
		(nextValue: Date | undefined) => {
			if (nextValue) onChange?.(nextValue)
		},
		[onChange],
	)

	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onChange: handleValueChange,
	})

	const today = useMemo(() => new Date(), [])

	const [viewDate, setViewDate] = useState(
		() =>
			new Date(
				(value ?? defaultValue ?? today).getFullYear(),
				(value ?? defaultValue ?? today).getMonth(),
				1,
			),
	)

	const year = viewDate.getFullYear()

	const month = viewDate.getMonth()

	const days = useMemo(() => getCalendarDays(year, month), [year, month])

	const prevMonth = useCallback(() => {
		setViewDate(new Date(year, month - 1, 1))
	}, [year, month])

	const nextMonth = useCallback(() => {
		setViewDate(new Date(year, month + 1, 1))
	}, [year, month])

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

	const handlePickerNavigate = useCallback((y: number, m: number) => {
		setViewDate(new Date(y, m, 1))
	}, [])

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)
		},
		[setValue],
	)

	const firstDayColumn = new Date(year, month, 1).getDay() + 1

	const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

	const activeGridDate = active?.zone === 'grid' ? active.date : null

	// Adjust viewDate during render when the driving prop changes (avoids an
	// extra render cycle that the previous useEffect approach caused).
	const prevActiveGridDateRef = useRef(activeGridDate)

	const prevValueRef = useRef(value)

	if (activeGridDate && activeGridDate !== prevActiveGridDateRef.current) {
		const next = new Date(activeGridDate.getFullYear(), activeGridDate.getMonth(), 1)

		if (next.getTime() !== viewDate.getTime()) {
			setViewDate(next)
		}
	}

	prevActiveGridDateRef.current = activeGridDate

	if (value && value !== prevValueRef.current) {
		if (
			value.getFullYear() !== viewDate.getFullYear() ||
			value.getMonth() !== viewDate.getMonth()
		) {
			setViewDate(new Date(value.getFullYear(), value.getMonth(), 1))
		}
	}
	prevValueRef.current = value

	const headerActiveIndex = active?.zone === 'header' ? active.index : null

	return (
		<div data-slot="calendar" className={cn(k.base, className)}>
			<div ref={headerRef} role="toolbar" onKeyDown={handleHeaderKeyDown} className={cn(k.header)}>
				<Button
					variant="plain"
					onClick={prevMonth}
					aria-label="Previous month"
					className={cn(headerActiveIndex === 0 && k.day.active)}
				>
					<ChevronLeft className={k.nav.icon} />
				</Button>
				<CalendarPicker
					year={year}
					month={month}
					today={today}
					onNavigate={handlePickerNavigate}
					monthLabel={monthLabel}
					open={pickerOpen}
					onOpenChange={handlePickerOpenChange}
					triggerClassName={cn(headerActiveIndex === 1 && k.day.active)}
				/>
				<Button
					variant="plain"
					onClick={nextMonth}
					aria-label="Next month"
					className={cn(headerActiveIndex === 2 && k.day.active)}
				>
					<ChevronRight className={k.nav.icon} />
				</Button>
			</div>

			<div className={k.grid}>
				{WEEKDAYS.map((day) => (
					<div key={day} className={cn(k.weekday)} aria-hidden="true">
						{day}
					</div>
				))}

				<div
					ref={gridRef}
					role="listbox"
					onKeyDown={handleGridKeyDown}
					className="col-span-7 grid grid-cols-7"
				>
					{days.map((date) => {
						const disabled = isDisabled(date)

						const isToday = isSameDay(date, today)

						const isSelected = value != null && isSameDay(date, value)

						const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

						const dayProps = getDayProps?.({ date, disabled, isToday, isSelected, isActive })

						const selected = dayProps?.selected ?? isSelected

						const gridColumnStart = date.getDate() === 1 ? firstDayColumn : undefined

						return (
							<DayCell
								key={date.toISOString()}
								date={date}
								disabled={disabled}
								isToday={isToday}
								isActive={isActive}
								selected={selected}
								variant={dayProps?.variant}
								color={dayProps?.color}
								customClassName={dayProps?.className}
								gridColumnStart={gridColumnStart}
								onSelect={handleSelect}
								onMouseEnter={dayProps?.onMouseEnter}
								onMouseLeave={dayProps?.onMouseLeave}
							/>
						)
					})}
				</div>
			</div>
		</div>
	)
}
