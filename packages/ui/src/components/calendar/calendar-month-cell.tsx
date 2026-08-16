'use client'

import { memo, type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { Button, type ButtonVariants } from '../button'
import type { CalendarDayContextValue } from './calendar'

type MonthCellProps = {
	/** The day this cell stands for, or `null` for a padding cell outside the month. */
	date: Date | null
	/** Every field below belongs to a real day; a padding cell reads none of them. */
	disabled?: boolean
	isToday?: boolean
	isActive?: boolean
	selected?: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	/** Stamped on the active cell's date button, so a parent's `aria-activedescendant` can reference it. */
	id?: string
	/** Resolved BCP 47 tag; the date's accessible name uses the same locale as the visible grid. */
	localeTag?: string
	onSelect?: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
	/**
	 * The caller's own content, drawn under the date.
	 *
	 * Taken as the renderer and the day it is called with, rather than as
	 * already-rendered children: an element built in the grid is a new object
	 * every render, so `memo` below would miss on every cell that had content —
	 * which is every cell the slot exists for. Held as a function, the grid's own
	 * re-render costs nothing until `renderDay` itself changes.
	 */
	renderDay?: (context: CalendarDayContextValue) => ReactNode
	/**
	 * Whether the day is the calendar's own selection, before `getDayProps` has a
	 * say. `selected` above is what the cell draws; this is what the day is, and
	 * it is what `renderDay` is told.
	 */
	daySelected?: boolean
}

/**
 * One `month`-layout cell: a `<td>` holding the date as a button and the
 * caller's content beneath it.
 *
 * The cell is a region rather than a control, which is the whole difference from
 * the `picker` layout. A cell that holds a second control cannot itself be a
 * button — the nested one would be unreachable and the markup invalid — so the
 * date keeps the button and the cell becomes the box around it.
 *
 * The date button carries `data-calendar-day`, which is what the grid's roving
 * navigation moves between: without it the arrow keys would walk into whatever
 * the caller drew and the seven-column arithmetic would come apart.
 *
 * A padding cell draws nothing and takes no focus, but is still a cell, so every
 * row holds seven and the week keeps its shape.
 *
 * @internal
 */
export const CalendarMonthCell = memo(function CalendarMonthCell({
	date,
	disabled,
	isToday,
	isActive,
	selected,
	variant,
	color,
	className,
	id,
	localeTag,
	onSelect,
	onMouseEnter,
	onMouseLeave,
	renderDay,
	daySelected = false,
}: MonthCellProps) {
	const handleClick = useCallback(() => {
		if (date !== null && !disabled) onSelect?.(date)
	}, [date, disabled, onSelect])

	const label = useMemo(
		() =>
			date === null
				? ''
				: date.toLocaleDateString(localeTag, {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric',
					}),
		[date, localeTag],
	)

	// Assembled here rather than handed down, so the object is stable while the
	// day is: built in the grid it would be new on every render, and the `memo`
	// below would miss on every cell that draws anything.
	const context = useMemo<CalendarDayContextValue | null>(
		() =>
			date === null
				? null
				: {
						date,
						disabled: disabled === true,
						today: isToday === true,
						selected: daySelected,
						active: isActive === true,
					},
		[date, disabled, isToday, daySelected, isActive],
	)

	const content = context === null ? null : renderDay?.(context)

	// The role is written down rather than left to the table's own mapping. A
	// `<td>` inside a `role="grid"` is a `gridcell` by inheritance, and assistive
	// tech applies that — but nothing else does, so a cell queried by role reads
	// as a plain `cell` to every tool that stops at the element.
	if (date === null) {
		return (
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a `<td>` in a grid is a gridcell (WAI-ARIA APG); written down so a role query finds it
			// biome-ignore lint/a11y/useFocusableInteractive: a gridcell is a container, and the date inside it takes the focus
			<td role="gridcell" className={cn(k.month.cell, className)} />
		)
	}

	return (
		// biome-ignore lint/a11y/useFocusableInteractive: a gridcell is a container, and the date inside it takes the focus
		<td
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a `<td>` in a grid is a gridcell (WAI-ARIA APG); written down so a role query finds it
			role="gridcell"
			// `data-selected` rather than `aria-selected`: the cell is a region, and
			// the state belongs to the control the reader acts on. The date button
			// below carries it where assistive tech reads it, through its own pressed
			// state; this is the hook the styling and the tests take.
			data-selected={selected ? '' : undefined}
			className={cn(k.month.cell, className)}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{/* The cell keeps its table display, so the column lives in a box of its
			    own. A `<td>` set to `flex` leaves the table layout and every row
			    stops being one. */}
			<div className={k.month.stack}>
				<Button
					type="button"
					id={id}
					data-calendar-day=""
					aria-label={label}
					aria-current={isToday ? 'date' : undefined}
					aria-pressed={selected}
					variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
					color={color ?? (selected || isToday ? 'blue' : undefined)}
					disabled={disabled}
					onClick={handleClick}
					className={cn(
						k.month.date,
						isActive && (selected ? k.day.active.selected : k.day.active.base),
					)}
				>
					{date.getDate()}
				</Button>

				{content == null ? null : <div className={k.month.content}>{content}</div>}
			</div>
		</td>
	)
})
