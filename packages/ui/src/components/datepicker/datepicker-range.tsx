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
	useRole,
} from '@floating-ui/react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { FormControl } from '../../primitives'
import { omote, sumi, ugoki } from '../../recipes'
import { Box } from '../box'
import { Button } from '../button'
import { type CalendarActive, type CalendarHandle, CalendarRange } from '../calendar'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import type { DatePickerBaseProps, DatePickerRangeProps } from './datepicker'
import { type FooterButton, useDatePickerKeyDown } from './use-keyboard'
import { addDays, clampDate, formatRange } from './utilities'
import { k, kCalendar, kPopover } from './variants'

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
	const glass = useGlass()

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

	const [rangeStart, setRangeStart] = useState<Date | null>(null)

	const [hoverDate, setHoverDate] = useState<Date | null>(null)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const pendingRef = useRef<{ value: [Date, Date] | undefined } | null>(null)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			setValue(pendingRef.current.value)

			pendingRef.current = null
		}

		setRangeStart(null)

		setHoverDate(null)

		setActive(null)
	}, [setValue])

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? value?.[0] ?? min ?? new Date(), min, max),
		[rangeStart, value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addDays(base, delta), min, max)

			if (rangeStart !== null) setHoverDate(next)

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
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

				// Pin both endpoints so the range stays stable through the exit animation.
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

	const showClear = rangeStart === null && value != null

	const footerButtons: FooterButton[] = showClear ? ['clear'] : []

	const handleFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const handlePickerOpenChange = useCallback((pickerOpen: boolean) => {
		if (!pickerOpen) {
			requestAnimationFrame(() => triggerRef.current?.focus())
		}
	}, [])

	const displayValue = value ? formatRange(value[0], value[1]) : ''

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

	const handleInputKeyDown = useDatePickerKeyDown({
		disabled,
		open,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		getInitialActiveDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate: handleFooterActivate,
	})

	return (
		<>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<FormControl
					data-open={open || undefined}
					className={cn(k.control[glass ? 'glass' : 'default'])}
				>
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
							className={kPopover.portal}
							{...getFloatingProps()}
							tabIndex={-1}
						>
							<motion.div
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn('z-50', sumi.text, glass && omote.glass)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Box bg={glass ? 'none' : 'popover'} border={glass || undefined} radius="lg">
									<CalendarRange
										ref={calendarRef}
										onChange={handleSelect}
										min={min}
										max={max}
										rangeStart={rangeStart ?? (value ? value[0] : null)}
										rangeEnd={rangeStart === null ? (value ? value[1] : null) : null}
										hoverDate={rangeStart !== null ? hoverDate : null}
										onHoverDate={setHoverDate}
										active={open ? active : null}
										onPickerOpenChange={handlePickerOpenChange}
									/>
									{showClear && (
										<div data-slot="calendar-footer" className={cn(kCalendar.footer)}>
											<Button
												variant="soft"
												color="amber"
												onClick={handleClear}
												aria-label="Clear selection"
												className={cn(
													active?.zone === 'footer' &&
														footerButtons[active.index] === 'clear' &&
														kCalendar.day.active,
												)}
											>
												Clear
											</Button>
										</div>
									)}
								</Box>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</>
	)
}
