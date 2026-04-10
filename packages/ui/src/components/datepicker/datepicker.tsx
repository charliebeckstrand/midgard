'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	type Placement,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { FormControl } from '../../primitives'
import { katachi, ugoki } from '../../recipes'
import { sumi } from '../../recipes/sumi'
import { Button } from '../button'
import { Calendar } from '../calendar'
import { Icon } from '../icon'
import { DatePickerRange } from './datepicker-range'
import { addDays, clampDate, formatDate } from './datepicker-utilities'
import { useInputKeyDown } from './use-keyboard'

const k = katachi.datepicker

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onChange?: (value: Date | undefined) => void
}

export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onChange?: (value: [Date, Date] | undefined) => void
}

export type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	className?: string
	disabled?: boolean
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

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

	const triggerRef = useRef<HTMLButtonElement>(null)

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

		setActiveDate(null)
	}, [])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		setActiveDate(null)
	}, [])

	const handleSelect = useCallback(
		(date: Date) => {
			setValue(date)

			closeCalendar()
		},
		[closeCalendar, setValue],
	)

	const handleClear = useCallback(() => {
		setValue(undefined)

		closeCalendar()
	}, [closeCalendar, setValue])

	const handleSelectToday = useCallback(() => {
		handleSelect(new Date())
	}, [handleSelect])

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

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: handleOpenChange,
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 })],
	})

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'dialog' })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	return (
		<>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<FormControl data-open={open || undefined}>
					<button
						ref={triggerRef}
						type="button"
						aria-haspopup="dialog"
						aria-expanded={open}
						data-slot="datepicker-button"
						disabled={disabled}
						onClick={() => {
							if (open) closeCalendar()
							else openCalendar()
						}}
						onKeyDown={handleInputKeyDown}
						className={cn(k.button)}
					>
						<span className={k.value}>
							{displayValue || <span className={cn(sumi.textMuted)}>{placeholder}</span>}
						</span>
					</button>
					<span className={cn(k.icon)}>
						<Icon icon={<CalendarIcon />} size="sm" />
					</span>
				</FormControl>
			</div>

			<FloatingPortal>
				<AnimatePresence>
					{open && (
						<div
							ref={refs.setFloating}
							style={floatingStyles}
							className={katachi.popover.portal}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn(katachi.popover.content, k.popoverContent)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Calendar
									value={value ?? null}
									onChange={handleSelect}
									min={min}
									max={max}
									activeDate={open ? activeDate : null}
								/>
								<div data-slot="calendar-footer" className={katachi.calendar.footer}>
									{value != null && (
										<Button
											variant="soft"
											color="amber"
											onClick={handleClear}
											aria-label="Clear selection"
										>
											Clear
										</Button>
									)}
									<Button variant="soft" color="blue" onClick={handleSelectToday}>
										Today
									</Button>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</>
	)
}
