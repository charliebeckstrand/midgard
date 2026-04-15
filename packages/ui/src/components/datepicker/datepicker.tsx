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
import { Calendar as CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useFocusTrap } from '../../hooks/use-focus-trap'
import { FormControl } from '../../primitives'
import { omote, sumi, ugoki } from '../../recipes'
import { Box } from '../box'
import { Button } from '../button'
import { Calendar, type CalendarActive, type CalendarHandle } from '../calendar'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { DatePickerRange } from './datepicker-range'
import { type FooterButton, useDatePickerKeyDown } from './use-keyboard'
import { addDays, clampDate, formatDate } from './utilities'
import { k, kCalendar, kPopover } from './variants'

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
	const glass = useGlass()

	const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange })

	const [open, setOpen] = useState(false)

	const focusTrapRef = useFocusTrap(open)

	const [active, setActive] = useState<CalendarActive | null>(null)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const getInitialActiveDate = useCallback(
		() => clampDate(value ?? min ?? new Date(), min, max),
		[value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			return clampDate(addDays(base, delta), min, max)
		},
		[active, getInitialActiveDate, min, max],
	)

	const openCalendar = useCallback(() => {
		setOpen(true)

		setActive(null)
	}, [])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		setActive(null)
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

	const handlePickerOpenChange = useCallback((pickerOpen: boolean) => {
		if (!pickerOpen) {
			// Defer past the Popover's own focus restore.
			requestAnimationFrame(() => triggerRef.current?.focus())
		}
	}, [])

	const handleFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
			else handleSelectToday()
		},
		[handleClear, handleSelectToday],
	)

	const footerButtons: FooterButton[] = value != null ? ['clear', 'today'] : ['today']

	const displayValue = value ? formatDate(value) : ''

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
				<FormControl
					data-open={open || undefined}
					className={cn(k.control[glass ? 'glass' : 'default'])}
				>
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
							className={kPopover.portal}
							{...getFloatingProps()}
						>
							<motion.div
								ref={focusTrapRef}
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn('z-50', sumi.text, glass && omote.glass)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Box bg={glass ? 'none' : 'popover'} border={glass || undefined} radius="lg">
									<Calendar
										ref={calendarRef}
										value={value ?? null}
										onChange={handleSelect}
										min={min}
										max={max}
										active={open ? active : null}
										onPickerOpenChange={handlePickerOpenChange}
										footerRef={footerRef}
									/>
									<div
										ref={footerRef}
										role="toolbar"
										data-slot="calendar-footer"
										onKeyDown={(e) => calendarRef.current?.footerKeyDown(e)}
										className={cn(kCalendar.footer)}
									>
										{value != null && (
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
										)}
										<Button
											variant="soft"
											color="blue"
											onClick={handleSelectToday}
											className={cn(
												active?.zone === 'footer' &&
													footerButtons[active.index] === 'today' &&
													kCalendar.day.active,
											)}
										>
											Today
										</Button>
									</div>
								</Box>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</>
	)
}
