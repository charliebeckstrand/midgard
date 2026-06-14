'use client'

import { memo, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { Button, type ButtonVariants } from '../button'

type DayCellProps = {
	date: Date
	disabled: boolean
	isToday: boolean
	isActive: boolean
	selected: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	gridColumnStart?: number
	/** Resolved BCP 47 tag; the day's accessible name uses the same locale as the visible grid. */
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
	gridColumnStart,
	localeTag,
	onSelect,
	onMouseEnter,
	onMouseLeave,
}: DayCellProps) {
	const handleClick = useCallback(() => {
		if (!disabled) onSelect(date)
	}, [disabled, onSelect, date])

	const label = useMemo(
		() =>
			date.toLocaleDateString(localeTag, {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			}),
		[date, localeTag],
	)

	return (
		<Button
			role="option"
			aria-selected={selected}
			aria-label={label}
			aria-current={isToday ? 'date' : undefined}
			variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
			color={color ?? (selected || isToday ? 'blue' : undefined)}
			disabled={disabled}
			onClick={handleClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={gridColumnStart ? { gridColumnStart } : undefined}
			className={cn(
				k.day.base,
				isActive && (selected ? k.day.activeSelected : k.day.active),
				className,
			)}
		>
			{date.getDate()}
		</Button>
	)
})
