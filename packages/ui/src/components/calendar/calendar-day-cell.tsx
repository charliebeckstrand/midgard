'use client'

import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { Button, type ButtonVariants } from '../button'

export type DayCellProps = {
	date: Date
	disabled: boolean
	isToday: boolean
	isActive: boolean
	selected: boolean
	variant?: ButtonVariants['variant']
	color?: ButtonVariants['color']
	className?: string
	gridColumnStart?: number
	onSelect: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

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
	onSelect,
	onMouseEnter,
	onMouseLeave,
}: DayCellProps) {
	const handleClick = () => {
		if (!disabled) onSelect(date)
	}

	return (
		<Button
			variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
			color={color ?? (selected || isToday ? 'blue' : undefined)}
			aria-pressed={selected}
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
