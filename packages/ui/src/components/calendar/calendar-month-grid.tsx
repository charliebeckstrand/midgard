'use client'

import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import type { CalendarDayContextValue, CalendarDayProps } from './calendar'
import { CalendarMonthCell } from './calendar-month-cell'
import { isSameDay, toWeeks } from './calendar-utilities'

type CalendarMonthGridProps = {
	gridRef: RefObject<HTMLTableElement | null>
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
	renderDay?: (context: CalendarDayContextValue) => ReactNode
	onSelect: (date: Date) => void
	/** Accessible name for the grid, e.g. "June 2025". */
	monthLabel: string
	/** Resolved BCP 47 tag, threaded to each cell's accessible day name. */
	localeTag: string
	/** Id for the grid, so a parent's `aria-controls` can point at it. */
	listboxId?: string
	/** Id stamped on the active cell's date button, so a parent's `aria-activedescendant` can reference it. */
	activeDescendantId?: string
}

/**
 * The `month` layout: a real `<table>` marked `role="grid"`, one row per week
 * and one `<td>` per day.
 *
 * A table rather than the flat CSS grid the `picker` layout uses, because a cell
 * that holds more than a date is a `gridcell`, and a `gridcell` has to sit in a
 * row. The table gives both for nothing — and the weekday header row becomes
 * `<th scope="col">`, which is what tells a screen reader which column a day is
 * in.
 *
 * @internal
 */
export function CalendarMonthGrid({
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
	renderDay,
	onSelect,
	monthLabel,
	localeTag,
	listboxId,
	activeDescendantId,
}: CalendarMonthGridProps) {
	const weeks = toWeeks(days, firstDayColumn)

	return (
		// `table-fixed` is what keeps the seven columns even: without it a week
		// holding one long meal name would take the room from every other column.
		<table
			ref={gridRef}
			id={listboxId}
			// A table whose cells hold controls is a grid, which is exactly the case
			// this layout exists for. The rule reads `<table>` as non-interactive and
			// cannot see the buttons the cells carry.
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: an interactive table is a grid (WAI-ARIA APG)
			role="grid"
			aria-label={monthLabel}
			onKeyDown={onGridKeyDown}
			className="w-full table-fixed"
		>
			<thead>
				<tr>
					{weekdays.map((day) => (
						<th key={day} scope="col" className={cn(k.weekday({ size }), 'aspect-auto')}>
							{day}
						</th>
					))}
				</tr>
			</thead>

			<tbody>
				{weeks.map((week) => (
					// The week's first day names the row, and a week of nothing but padding
					// cannot happen — `toWeeks` pads the ends of a real month.
					<tr key={week.find((cell) => cell.date !== null)?.key ?? week[0]?.key}>
						{week.map(({ date, key }) => {
							if (date === null) {
								return (
									<CalendarMonthCell
										key={key}
										date={null}
										{...EMPTY}
										localeTag={localeTag}
										onSelect={onSelect}
									/>
								)
							}

							const disabled = isDisabled(date)

							const isToday = today != null && isSameDay(date, today)

							const isSelected = value != null && isSameDay(date, value)

							const isActive = activeGridDate != null && isSameDay(date, activeGridDate)

							const context = {
								date,
								disabled,
								today: isToday,
								selected: isSelected,
								active: isActive,
							}

							const dayProps = getDayProps?.(context)

							return (
								<CalendarMonthCell
									key={key}
									date={date}
									disabled={disabled}
									isToday={isToday}
									isActive={isActive}
									selected={dayProps?.selected ?? isSelected}
									variant={dayProps?.variant}
									color={dayProps?.color}
									className={dayProps?.className}
									id={isActive ? activeDescendantId : undefined}
									localeTag={localeTag}
									onSelect={onSelect}
									onMouseEnter={dayProps?.onMouseEnter}
									onMouseLeave={dayProps?.onMouseLeave}
								>
									{renderDay?.(context)}
								</CalendarMonthCell>
							)
						})}
					</tr>
				))}
			</tbody>
		</table>
	)
}

/** What a padding cell is, which is nothing at all. @internal */
const EMPTY = {
	disabled: true,
	isToday: false,
	isActive: false,
	selected: false,
} as const
