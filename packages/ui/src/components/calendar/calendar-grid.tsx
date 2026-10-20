'use client'

import { type KeyboardEventHandler, memo, type RefObject } from 'react'
import { ariaAttr, cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import type { CalendarDayContextValue, CalendarDayProps } from './calendar'
import { CalendarDayCell } from './calendar-day-cell'
import { sameDay } from './calendar-utilities'

/** The inputs of {@link getDayState} that are the same for each day of a render. @internal */
type DayStateInput = {
	today: Date | null
	value: Date | null | undefined
	activeGridDate: Date | null
	isDisabled: (date: Date) => boolean
	getDayProps?: (context: CalendarDayContextValue) => CalendarDayProps
}

/**
 * The state of the cell of `date`: the context that `getDayProps` gets, the
 * overrides that it returns, and the selection. `getDayProps` can override the
 * match with `value`, as a range does for its two endpoints. The grid paints
 * each cell from it, and the calendar finds the Tab stop of the grid from it,
 * so the two agree.
 *
 * @internal
 */
export function getDayState(
	date: Date,
	{ today, value, activeGridDate, isDisabled, getDayProps }: DayStateInput,
): { context: CalendarDayContextValue; dayProps: CalendarDayProps | undefined; selected: boolean } {
	const context: CalendarDayContextValue = {
		date,
		disabled: isDisabled(date),
		today: today != null && sameDay(date, today),
		selected: value != null && sameDay(date, value),
		active: activeGridDate != null && sameDay(date, activeGridDate),
	}

	const dayProps = getDayProps?.(context)

	return { context, dayProps, selected: dayProps?.selected ?? context.selected }
}

type CalendarGridProps = {
	gridRef: RefObject<HTMLDivElement | null>
	onGridKeyDown: KeyboardEventHandler<HTMLElement>
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
	/** Resolved BCP 47 tag, threaded to each cell's accessible day name. */
	localeTag: string
	/** Id for the `role="listbox"` grid, so a parent input's `aria-controls` can point at it. */
	listboxId?: string
	/** Id stamped on the active cell, so a parent input's `aria-activedescendant` can reference the roved day. */
	activeDescendantId?: string
	/** Marks the listbox `aria-multiselectable`, for a `getDayProps` that selects more than one day. */
	multiselectable?: boolean
}

/**
 * Weekday header row plus the `role="listbox"` day grid. Resolves per-cell
 * today/selected/active flags, lets `getDayProps` override styling, and offsets
 * the 1st into its locale-aware column via `gridColumnStart`. Memoized: the
 * month/year picker and the roved header control do not render the grid again.
 *
 * @internal
 */
export const CalendarGrid = memo(function CalendarGrid({
	gridRef,
	onGridKeyDown,
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
	localeTag,
	listboxId,
	activeDescendantId,
	multiselectable,
}: CalendarGridProps) {
	return (
		<div className={k.grid}>
			{weekdays.map((day) => (
				<div key={day} className={cn(k.weekday)} aria-hidden="true">
					{day}
				</div>
			))}

			<div
				ref={gridRef}
				id={listboxId}
				role="listbox"
				aria-label={monthLabel}
				aria-multiselectable={ariaAttr(multiselectable)}
				onKeyDown={onGridKeyDown}
				className="col-span-7 grid grid-cols-7"
			>
				{days.map((date) => {
					const { context, dayProps, selected } = getDayState(date, {
						today,
						value,
						activeGridDate,
						isDisabled,
						getDayProps,
					})

					const gridColumnStart = date.getDate() === 1 ? firstDayColumn : undefined

					return (
						<CalendarDayCell
							key={date.toISOString()}
							date={date}
							disabled={context.disabled}
							isToday={context.today}
							isActive={context.active}
							selected={selected}
							variant={dayProps?.variant}
							color={dayProps?.color}
							className={dayProps?.className}
							id={context.active ? activeDescendantId : undefined}
							gridColumnStart={gridColumnStart}
							localeTag={localeTag}
							onSelect={onSelect}
							onMouseEnter={dayProps?.onMouseEnter}
							onMouseLeave={dayProps?.onMouseLeave}
						/>
					)
				})}
			</div>
		</div>
	)
})
