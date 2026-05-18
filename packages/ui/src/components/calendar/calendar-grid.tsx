'use client'

import type { KeyboardEventHandler, RefObject } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import type { Step } from '../../recipes/ryu/sun'
import type { CalendarDayContext, CalendarDayProps } from './calendar'
import { WEEKDAYS } from './calendar-constants'
import { CalendarDayCell } from './calendar-day-cell'
import { isSameDay } from './calendar-utilities'

export type CalendarGridProps = {
	gridRef: RefObject<HTMLDivElement | null>
	onGridKeyDown: KeyboardEventHandler<HTMLElement>
	size: Step
	days: Date[]
	firstDayColumn: number
	today: Date
	value: Date | null | undefined
	activeGridDate: Date | null
	isDisabled: (date: Date) => boolean
	getDayProps?: (context: CalendarDayContext) => CalendarDayProps
	onSelect: (date: Date) => void
}

export function CalendarGrid({
	gridRef,
	onGridKeyDown,
	size,
	days,
	firstDayColumn,
	today,
	value,
	activeGridDate,
	isDisabled,
	getDayProps,
	onSelect,
}: CalendarGridProps) {
	return (
		<div className={k.grid}>
			{WEEKDAYS.map((day) => (
				<div key={day} className={cn(k.weekday({ size }))} aria-hidden="true">
					{day}
				</div>
			))}

			<div
				ref={gridRef}
				role="listbox"
				onKeyDown={onGridKeyDown}
				className="col-span-7 grid grid-cols-7"
			>
				{days.map((date) => {
					const disabled = isDisabled(date)

					const isToday = isSameDay(date, today)

					const isSelected = value != null && isSameDay(date, value)

					const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

					const dayProps = getDayProps?.({ date, disabled, isToday, isSelected, isActive })

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
