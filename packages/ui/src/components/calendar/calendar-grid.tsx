'use client'

import { type KeyboardEventHandler, type RefObject, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import type { Step } from '../../recipes/ryu/sun'
import type { CalendarDayContext, CalendarDayProps } from './calendar'
import { WEEKDAYS } from './calendar-constants'
import { CalendarDayCell } from './calendar-day-cell'
import { isSameDay } from './calendar-utilities'

export type CalendarGridProps = {
	gridRef: RefObject<HTMLTableElement | null>
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
	'aria-label'?: string
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
	'aria-label': ariaLabel = 'Calendar',
}: CalendarGridProps) {
	// Chunk into ARIA rows of up to 7 days. The first row starts at `firstDayColumn`
	// (Sun=1…Sat=7), so it's padded with leading empty `<td>` cells; the rest are
	// full weeks except possibly the last. `<tr>`/`<tbody>`/`<thead>` use
	// `display: contents` so the outer CSS grid (`grid-cols-7`) still positions
	// every `<td>` directly.
	const weeks = useMemo(() => {
		const result: Date[][] = []
		let current: Date[] = []
		let col = firstDayColumn

		for (const date of days) {
			current.push(date)

			if (col === 7) {
				result.push(current)
				current = []
				col = 1
			} else {
				col++
			}
		}

		if (current.length > 0) result.push(current)

		return result
	}, [days, firstDayColumn])

	const leadingEmpty = firstDayColumn - 1

	return (
		<table ref={gridRef} aria-label={ariaLabel} onKeyDown={onGridKeyDown} className={k.grid}>
			<thead className="contents">
				<tr className="contents">
					{WEEKDAYS.map((day) => (
						<th key={day} scope="col" className={cn(k.weekday({ size }))}>
							{day}
						</th>
					))}
				</tr>
			</thead>
			<tbody className="contents">
				{weeks.map((week, weekIndex) => (
					<tr key={week[0]?.toISOString()} className="contents">
						{weekIndex === 0 &&
							Array.from({ length: leadingEmpty }, (_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: positional placeholder for leading empty cells
								<td key={`empty-${i}`} aria-hidden="true" />
							))}
						{week.map((date) => {
							const disabled = isDisabled(date)

							const isToday = isSameDay(date, today)

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

							return (
								<td key={date.toISOString()} className="contents">
									<CalendarDayCell
										date={date}
										disabled={disabled}
										isToday={isToday}
										isActive={isActive}
										selected={selected}
										variant={dayProps?.variant}
										color={dayProps?.color}
										className={dayProps?.className}
										onSelect={onSelect}
										onMouseEnter={dayProps?.onMouseEnter}
										onMouseLeave={dayProps?.onMouseLeave}
									/>
								</td>
							)
						})}
					</tr>
				))}
			</tbody>
		</table>
	)
}
