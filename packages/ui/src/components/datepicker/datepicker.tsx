'use client'

import { CalendarIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Calendar } from '../calendar'
import { Icon } from '../icon'
import { Input } from '../input'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onChange?: (value: Date) => void
}

type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onChange?: (value: [Date, Date]) => void
}

type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
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
	className,
	disabled = false,
}: DatePickerBaseProps & DatePickerSingleProps) {
	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })
	const [open, setOpen] = useState(false)

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)
			setOpen(false)
		},
		[setValue],
	)

	const displayValue = value ? formatDate(value) : ''

	return (
		<Popover placement="bottom-start" open={open} onOpenChange={setOpen}>
			<PopoverTrigger>
				<Input
					readOnly
					value={displayValue}
					placeholder={placeholder}
					disabled={disabled}
					className={cn('cursor-pointer', className)}
					suffix={<Icon icon={<CalendarIcon />} />}
				/>
			</PopoverTrigger>
			<PopoverContent className="p-0">
				<Calendar value={value} onChange={handleSelect} min={min} max={max} />
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
	className,
	disabled = false,
}: DatePickerBaseProps & DatePickerRangeProps) {
	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })
	const [open, setOpen] = useState(false)
	const [rangeStart, setRangeStart] = useState<Date | null>(null)
	const [hoverDate, setHoverDate] = useState<Date | null>(null)

	const handleSelect = useCallback(
		(date: Date) => {
			if (rangeStart === null) {
				setRangeStart(date)
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
				setOpen(false)
			}
		},
		[rangeStart, setValue],
	)

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) {
			setRangeStart(null)
			setHoverDate(null)
		}
	}, [])

	const displayValue = value ? formatRange(value[0], value[1]) : ''

	return (
		<Popover placement="bottom-start" open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger>
				<Input
					readOnly
					value={displayValue}
					placeholder={placeholder}
					disabled={disabled}
					className={cn('cursor-pointer', className)}
					suffix={<Icon icon={<CalendarIcon />} />}
				/>
			</PopoverTrigger>
			<PopoverContent className="p-0">
				<Calendar
					value={undefined}
					onChange={handleSelect}
					min={min}
					max={max}
					rangeStart={rangeStart ?? (value ? value[0] : null)}
					rangeEnd={rangeStart === null ? (value ? value[1] : null) : null}
					hoverDate={rangeStart !== null ? hoverDate : null}
					onHoverDate={setHoverDate}
				/>
			</PopoverContent>
		</Popover>
	)
}
