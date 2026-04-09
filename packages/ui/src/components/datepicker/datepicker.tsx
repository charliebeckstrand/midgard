'use client'

import { CalendarIcon, XIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { katachi } from '../../recipes'
import { Calendar } from '../calendar'
import { Icon } from '../icon'
import { Input } from '../input'
import { Popover, PopoverContent, type PopoverProps, PopoverTrigger } from '../popover'
import { useInputKeyDown } from './use-input-keydown'

const k = katachi.datepicker

type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onChange?: (value: Date | undefined) => void
}

type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onChange?: (value: [Date, Date] | undefined) => void
}

type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: PopoverProps['placement']
	className?: string
	disabled?: boolean
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

function formatDate(date: Date): string {
	return date.toLocaleDateString()
}

function formatRange(start: Date, end: Date): string {
	return `${formatDate(start)} – ${formatDate(end)}`
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function clampDate(date: Date, min?: Date, max?: Date): Date {
	const value = startOfDay(date).getTime()

	const minValue = min ? startOfDay(min).getTime() : Number.NEGATIVE_INFINITY
	const maxValue = max ? startOfDay(max).getTime() : Number.POSITIVE_INFINITY

	const clamped = Math.min(Math.max(value, minValue), maxValue)

	return new Date(clamped)
}

export function DatePicker(props: DatePickerProps) {
	if (props.range) {
		return <DatePickerRange {...props} />
	}

	return <DatePickerSingle {...props} />
}

function DatePickerSingle({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	placeholder = 'Select a date',
	placement = 'bottom-start',
	className,
	disabled = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)
	const [activeDate, setActiveDate] = useState<Date | null>(null)

	const getInitialActiveDate = useCallback(
		() => clampDate(value ?? min ?? new Date(), min, max),
		[value, min, max],
	)

	const moveActiveDate = useCallback(
		(delta: number) => {
			const next = clampDate(addDays(activeDate ?? getInitialActiveDate(), delta), min, max)
			setActiveDate(next)
		},
		[activeDate, getInitialActiveDate, min, max],
	)

	const openCalendar = useCallback(() => {
		setOpen(true)
		setActiveDate(getInitialActiveDate())
	}, [getInitialActiveDate])

	const closeCalendar = useCallback(() => {
		setOpen(false)
		setActiveDate(getInitialActiveDate())
	}, [getInitialActiveDate])

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)
			closeCalendar()
		},
		[closeCalendar, setValue],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				openCalendar()
			} else {
				closeCalendar()
			}
		},
		[closeCalendar, openCalendar],
	)

	const clearValue = useCallback(() => {
		closeCalendar()

		setValue(undefined)
	}, [closeCalendar, setValue])

	const displayValue = value ? formatDate(value) : ''

	const handleInputKeyDown = useInputKeyDown({
		disabled,
		open,
		activeDate,
		openCalendar,
		closeCalendar,
		moveActiveDate,
		getInitialActiveDate,
		handleSelect,
	})

	return (
		<Popover placement={placement} open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger manual>
				<Input
					readOnly
					value={displayValue}
					placeholder={placeholder}
					disabled={disabled}
					onFocus={() => {
						if (!disabled) openCalendar()
					}}
					onClick={() => {
						if (!disabled) openCalendar()
					}}
					onKeyDown={handleInputKeyDown}
					className={cn(k.input, className)}
					suffix={
						value && !disabled ? (
							<button
								type="button"
								data-popover-ignore
								onPointerDown={(e) => {
									e.preventDefault()
									e.stopPropagation()

									clearValue()
								}}
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()

									clearValue()
								}}
								className={cn(k.clearButton)}
							>
								<Icon icon={<XIcon />} />
							</button>
						) : (
							<Icon icon={<CalendarIcon />} />
						)
					}
				/>
			</PopoverTrigger>
			<PopoverContent className={k.popoverContent}>
				<Calendar
					value={value ?? null}
					onChange={handleSelect}
					min={min}
					max={max}
					activeDate={open ? activeDate : null}
				/>
			</PopoverContent>
		</Popover>
	)
}

function DatePickerRange({
	value: valueProp,
	defaultValue,
	onChange,
	min,
	max,
	placeholder = 'Select dates',
	placement = 'bottom-start',
	className,
	disabled = false,
}: DatePickerBaseProps & DatePickerRangeProps) {
	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })
	const [open, setOpen] = useState(false)
	const [rangeStart, setRangeStart] = useState<Date | null>(null)
	const [hoverDate, setHoverDate] = useState<Date | null>(null)
	const [activeDate, setActiveDate] = useState<Date | null>(null)

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? value?.[0] ?? min ?? new Date(), min, max),
		[rangeStart, value, min, max],
	)

	const moveActiveDate = useCallback(
		(delta: number) => {
			const next = clampDate(addDays(activeDate ?? getInitialActiveDate(), delta), min, max)

			setActiveDate(next)
		},
		[activeDate, getInitialActiveDate, min, max],
	)

	const openCalendar = useCallback(() => {
		setOpen(true)
		setActiveDate(getInitialActiveDate())
	}, [getInitialActiveDate])

	const closeCalendar = useCallback(() => {
		setOpen(false)
		setRangeStart(null)
		setHoverDate(null)
		setActiveDate(getInitialActiveDate())
	}, [getInitialActiveDate])

	const handleSelect = useCallback(
		(date: Date) => {
			if (rangeStart === null) {
				setRangeStart(date)

				setHoverDate(null)
			} else {
				const start = rangeStart

				const end = date

				if (start.getTime() <= end.getTime()) {
					setValue([start, end])
				} else {
					setValue([end, start])
				}

				setRangeStart(null)

				setHoverDate(null)

				closeCalendar()
			}
		},
		[closeCalendar, rangeStart, setValue],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				closeCalendar()
			} else {
				openCalendar()
			}
		},
		[closeCalendar, openCalendar],
	)

	const clearRange = useCallback(() => {
		closeCalendar()
		setValue(undefined)
	}, [closeCalendar, setValue])

	const displayValue = value ? formatRange(value[0], value[1]) : ''

	const handleInputKeyDown = useInputKeyDown({
		disabled,
		open,
		activeDate,
		openCalendar,
		closeCalendar,
		moveActiveDate,
		getInitialActiveDate,
		handleSelect,
	})

	return (
		<Popover placement={placement} open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger manual>
				<Input
					readOnly
					value={displayValue}
					placeholder={placeholder}
					disabled={disabled}
					onFocus={() => {
						if (!disabled) openCalendar()
					}}
					onClick={() => {
						if (!disabled) openCalendar()
					}}
					onKeyDown={handleInputKeyDown}
					className={cn(k.input, className)}
					suffix={
						value && !disabled ? (
							<button
								type="button"
								data-popover-ignore
								onPointerDown={(e) => {
									e.preventDefault()
									e.stopPropagation()

									clearRange()
								}}
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()

									clearRange()
								}}
								className={cn(k.clearButton)}
							>
								<Icon icon={<XIcon />} />
							</button>
						) : (
							<Icon icon={<CalendarIcon />} />
						)
					}
				/>
			</PopoverTrigger>
			<PopoverContent className={k.popoverContent}>
				<Calendar
					value={undefined}
					onChange={handleSelect}
					min={min}
					max={max}
					rangeStart={rangeStart ?? (value ? value[0] : null)}
					rangeEnd={rangeStart === null ? (value ? value[1] : null) : null}
					hoverDate={rangeStart !== null ? hoverDate : null}
					onHoverDate={setHoverDate}
					activeDate={open ? activeDate : null}
				/>
			</PopoverContent>
		</Popover>
	)
}
