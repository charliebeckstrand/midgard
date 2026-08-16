'use client'

import { memo, type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { Button, type ButtonVariants } from '../button'

type MonthCellProps = {
	/** The day this cell stands for, or `null` for a padding cell outside the month. */
	date: Date | null
	disabled: boolean
	isToday: boolean
	isActive: boolean
	selected: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	/** Stamped on the active cell's date button, so a parent's `aria-activedescendant` can reference it. */
	id?: string
	/** Resolved BCP 47 tag; the date's accessible name uses the same locale as the visible grid. */
	localeTag: string
	onSelect: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
	/** What the caller draws under the date. */
	children?: ReactNode
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
	children,
}: MonthCellProps) {
	const handleClick = useCallback(() => {
		if (date !== null && !disabled) onSelect(date)
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

			{children === undefined ? null : <div className={k.month.content}>{children}</div>}
		</td>
	)
})
