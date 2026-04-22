'use client'

import { FloatingPortal } from '@floating-ui/react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useFocusTrap } from '../../hooks/use-focus-trap'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlFrame } from '../../primitives'
import { iro, omote, ugoki } from '../../recipes'
import { Box } from '../box'
import { Button } from '../button'
import { type CalendarActive, type CalendarHandle, CalendarRange } from '../calendar'
import { useControl } from '../control/context'
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
	const control = useControl()
	const scope = useIdScope({ id: control?.id })

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

	const focusTrapRef = useFocusTrap(open)

	const [rangeStart, setRangeStart] = useState<Date | null>(null)

	const [hoverDate, setHoverDate] = useState<Date | null>(null)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const pendingRef = useRef<{ value: [Date, Date] | undefined } | null>(null)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

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

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const handleFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const handlePickerOpenChange = useCallback((_pickerOpen: boolean) => {
		// The CalendarPicker's Popover restores focus to its own trigger
		// (the month/year button inside the Calendar header) on close.
		// We intentionally do nothing here to keep focus inside the focus trap.
	}, [])

	const displayValue = value ? formatRange(value[0], value[1]) : ''

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
	})

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
				<ControlFrame
					data-open={open || undefined}
					className={cn(k.control[glass ? 'glass' : 'default'])}
				>
					<button
						ref={triggerRef}
						type="button"
						id={scope.id}
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
							{displayValue || <span className={cn(iro.text.muted)}>{placeholder}</span>}
						</span>
					</button>
					<span className={cn(k.icon)}>
						<Icon icon={<CalendarIcon />} size="sm" />
					</span>
				</ControlFrame>
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
								ref={focusTrapRef}
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn('z-50', iro.text.default, glass && omote.glass)}
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
										footerRef={footerRef}
									/>
									{showClear && (
										<div
											ref={footerRef}
											role="toolbar"
											data-slot="calendar-footer"
											onKeyDown={(e) => calendarRef.current?.footerKeyDown(e)}
											className={cn(kCalendar.footer)}
										>
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
