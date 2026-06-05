'use client'

import type { KeyboardEventHandler, RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import type { CalendarDayContextValue, CalendarDayProps } from './calendar'
import { CalendarDayCell } from './calendar-day-cell'
import { isSameDay } from './calendar-utilities'

type CalendarGridProps = {
	gridRef: RefObject<HTMLDivElement | null>
	onGridKeyDown: KeyboardEventHandler<HTMLElement>
	size: Step
	/** Short weekday labels, pre-ordered to the active locale's first day. */
	weekdays: string[]
	days: Date[]
	firstDayColumn: number
	today: Date | null
	value: Date | null | undefined
	activeGridDate: Date | null
	isDisabled: (date: Date) => boolean
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
	onSelect: (date: Date) => void
	/** Accessible name for the day listbox, e.g. "June 2025". */
	monthLabel: string
}

export function CalendarGrid({
	gridRef,
	onGridKeyDown,
	size,
	weekdays,
	days,
	firstDayColumn,
	today,
	value,
	activeGridDate,
	isDisabled,
	getDayProps,
	onSelect,
	monthLabel,
}: CalendarGridProps) {
	return (
		<div className={k.grid}>
			{weekdays.map((day) => (
				<div key={day} className={cn(k.weekday({ size }))} aria-hidden="true">
					{day}
				</div>
			))}

			<div
				ref={gridRef}
				role="listbox"
				aria-label={monthLabel}
				onKeyDown={onGridKeyDown}
				className="col-span-7 grid grid-cols-7"
			>
				{days.map((date) => {
					const disabled = isDisabled(date)

					const isToday = today != null && isSameDay(date, today)

					const isSelected = value != null && isSameDay(date, value)

					const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

					const dayProps = getDayProps?.({
						date,
						disabled,
						today: isToday,
						selected: isSelected,
						active: isActive,
					})

					const selected = dayProps?.selected ?? isSelected

					const gridColumnStart = date.getDate() === 1 ? firstDayColumn : undefined

					return (
						<CalendarDayCell
							key={date.toISOString()}
							date={date}
							disabled={disabled}
							isToday={isToday}
							isActive={isActive}
							selected={selected}
							variant={dayProps?.variant}
							color={dayProps?.color}
							className={dayProps?.className}
							gridColumnStart={gridColumnStart}
							onSelect={onSelect}
							onMouseEnter={dayProps?.onMouseEnter}
							onMouseLeave={dayProps?.onMouseLeave}
						/>
					)
				})}
			</div>
		</div>
	)
}
