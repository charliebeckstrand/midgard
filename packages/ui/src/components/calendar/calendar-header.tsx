'use client'

import { type KeyboardEventHandler, memo, type RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { CalendarPicker } from './calendar-picker'
import { CalendarToolbar } from './calendar-toolbar'

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

/**
 * `role="toolbar"` row of prev/next month chevrons flanking the month/year
 * picker trigger. `activeIndex` paints the roving-focus highlight on the
 * matching control (0 prev, 1 picker, 2 next). Memoized: a move of the roved
 * day, a new selection, or a range preview does not render the header or its
 * picker again.
 *
 * @internal
 */
export const CalendarHeader = memo(function CalendarHeader({
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
		<CalendarToolbar
			toolbarRef={headerRef}
			label="Month navigation"
			onKeyDown={onHeaderKeyDown}
			size={size}
			prevLabel="Previous month"
			nextLabel="Next month"
			onPrev={onPrevMonth}
			onNext={onNextMonth}
			prevClassName={cn(activeIndex === 0 && k.day.active.base)}
			nextClassName={cn(activeIndex === 2 && k.day.active.base)}
		>
			<CalendarPicker
				year={year}
				month={month}
				today={today}
				onNavigate={onPickerNavigate}
				monthLabel={monthLabel}
				monthLabels={monthLabels}
				open={pickerOpen}
				onOpenChange={onPickerOpenChange}
				triggerClassName={cn(activeIndex === 1 && k.day.active.base)}
			/>
		</CalendarToolbar>
	)
})
