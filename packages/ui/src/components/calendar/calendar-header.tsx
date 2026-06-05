'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { KeyboardEventHandler, RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import { Icon } from '../icon'
import { CalendarPicker } from './calendar-picker'

type CalendarHeaderProps = {
	headerRef: RefObject<HTMLDivElement | null>
	onHeaderKeyDown: KeyboardEventHandler<HTMLElement>
	size: Step
	activeIndex: 0 | 1 | 2 | null
	year: number
	month: number
	today: Date | null
	monthLabel: string
	/** Short month labels for the year/month picker, in the active locale. */
	monthLabels: string[]
	pickerOpen: boolean
	onPickerOpenChange: (open: boolean) => void
	onPickerNavigate: (year: number, month: number) => void
	onPrevMonth: () => void
	onNextMonth: () => void
}

export function CalendarHeader({
	headerRef,
	onHeaderKeyDown,
	size,
	activeIndex,
	year,
	month,
	today,
	monthLabel,
	monthLabels,
	pickerOpen,
	onPickerOpenChange,
	onPickerNavigate,
	onPrevMonth,
	onNextMonth,
}: CalendarHeaderProps) {
	return (
		<div
			ref={headerRef}
			role="toolbar"
			aria-label="Month navigation"
			onKeyDown={onHeaderKeyDown}
			className={cn(k.header({ size }))}
		>
			<Button
				variant="plain"
				onClick={onPrevMonth}
				aria-label="Previous month"
				prefix={<Icon icon={<ChevronLeft />} />}
				className={cn(activeIndex === 0 && k.day.active)}
			/>
			<CalendarPicker
				year={year}
				month={month}
				today={today}
				onNavigate={onPickerNavigate}
				monthLabel={monthLabel}
				monthLabels={monthLabels}
				open={pickerOpen}
				onOpenChange={onPickerOpenChange}
				triggerClassName={cn(activeIndex === 1 && k.day.active)}
			/>
			<Button
				variant="plain"
				onClick={onNextMonth}
				aria-label="Next month"
				prefix={<Icon icon={<ChevronRight />} />}
				className={cn(activeIndex === 2 && k.day.active)}
			/>
		</div>
	)
}
