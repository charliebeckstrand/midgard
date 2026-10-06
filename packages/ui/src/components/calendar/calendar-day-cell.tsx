'use client'

import { memo, useCallback } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { formatInteger } from '../../utilities'
import { Button, type ButtonVariants } from '../button'
import { formatDayName, toCalendarDate } from './calendar-utilities'

type DayCellProps = {
	date: Date
	disabled: boolean
	isToday: boolean
	isActive: boolean
	selected: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	/** Stamped on the active cell only, so a parent's `aria-activedescendant` can reference the roved day. */
	id?: string
	gridColumnStart?: number
	/** Resolved BCP 47 tag; the day number and the accessible name of the day use the same locale as the visible grid. */
	localeTag: string
	onSelect: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

/**
 * One day-grid cell: a `role="option"` button carrying selection, today, and
 * active state with a locale-resolved accessible name. Memoized so only cells
 * whose props change re-render as focus or selection moves.
 *
 * @internal
 */
export const CalendarDayCell = memo(function CalendarDayCell({
	date,
	disabled,
	isToday,
	isActive,
	selected,
	variant,
	color,
	className,
	id,
	gridColumnStart,
	localeTag,
	onSelect,
	onMouseEnter,
	onMouseLeave,
}: DayCellProps) {
	const handleClick = useCallback(() => {
		if (!disabled) onSelect(date)
	}, [disabled, onSelect, date])

	return (
		<Button
			type="button"
			id={id}
			role="option"
			aria-selected={selected}
			aria-label={formatDayName(date, localeTag)}
			aria-current={isToday ? 'date' : undefined}
			// The date picker reads the day of a focused cell from this ISO date.
			data-date={toCalendarDate(date).toString()}
			variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
			color={color ?? (selected || isToday ? 'blue' : undefined)}
			disabled={disabled}
			onClick={handleClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={gridColumnStart ? { gridColumnStart } : undefined}
			className={cn(k.day.base, isActive && k.day.active, className)}
		>
			{formatInteger(date.getDate(), localeTag)}
		</Button>
	)
})
