'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
} from '@floating-ui/react'
import { CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { FormControl } from '../../primitives'
import { katachi, ugoki } from '../../recipes'
import { sumi } from '../../recipes/sumi'
import { CalendarRange } from '../calendar'
import { Icon } from '../icon'
import type { DatePickerBaseProps, DatePickerRangeProps } from './datepicker'
import { addDays, clampDate, formatRange } from './datepicker-utilities'
import { useInputKeyDown } from './use-keyboard'

const k = katachi.datepicker

export function DatePickerRange({
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

	const pendingRef = useRef<{ value: [Date, Date] | undefined } | null>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			setValue(pendingRef.current.value)

			pendingRef.current = null
		}

		setRangeStart(null)

		setHoverDate(null)

		setActiveDate(null)
	}, [setValue])

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
		flushPending()

		setOpen(true)
	}, [flushPending])

	const closeCalendar = useCallback(() => {
		setOpen(false)
	}, [])

	const handleClear = useCallback(() => {
		pendingRef.current = { value: undefined }

		closeCalendar()
	}, [closeCalendar])

	const handleSelect = useCallback(
		(date: Date) => {
			if (rangeStart === null) {
				setRangeStart(date)

				setHoverDate(null)
			} else {
				const start = rangeStart

				const end = date

				const range: [Date, Date] = start.getTime() <= end.getTime() ? [start, end] : [end, start]

				// Pin both endpoints so the visual range stays stable through the exit animation,
				// even when the second pick comes from the keyboard (no prior hoverDate).
				setHoverDate(end)

				pendingRef.current = { value: range }

				closeCalendar()
			}
		},
		[closeCalendar, rangeStart],
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

	const displayValue = value ? formatRange(value[0], value[1]) : ''

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: handleOpenChange,
		whileElementsMounted: autoUpdate,
		middleware: [offset(8), flip(), shift({ padding: 8 })],
	})

	const dismiss = useDismiss(context)

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss])

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
						disabled={disabled}
						data-slot="datepicker-button"
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
				<AnimatePresence onExitComplete={flushPending}>
					{open && (
						<div
							ref={refs.setFloating}
							style={floatingStyles}
							className={katachi.popover.portal}
							{...getFloatingProps()}
							tabIndex={-1}
						>
							<motion.div
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn(katachi.popover.content, k.popoverContent)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<CalendarRange
									onChange={handleSelect}
									onClear={rangeStart === null && value ? handleClear : undefined}
									min={min}
									max={max}
									rangeStart={rangeStart ?? (value ? value[0] : null)}
									rangeEnd={rangeStart === null ? (value ? value[1] : null) : null}
									hoverDate={rangeStart !== null ? hoverDate : null}
									onHoverDate={setHoverDate}
									activeDate={open ? activeDate : null}
								/>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</>
	)
}
