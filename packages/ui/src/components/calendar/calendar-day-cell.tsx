'use client'

import { memo, useCallback } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import type { ButtonVariants } from '../../recipes/kata/button'
import { k } from '../../recipes/kata/calendar'
import { formatInteger } from '../../utilities/format-number'
import { Button } from '../button'
import { dayKey, formatDayName } from './calendar-utilities'

type DayCellProps = {
	date: Date
	/** The day cannot be picked. */
	disabled: boolean
	/**
	 * A disabled day that keeps the focus: it is `aria-disabled`, and the arrows
	 * move across it. A disabled day that is not focusable is natively disabled.
	 */
	focusable: boolean
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
	/** Whether the cell has the accessible name of its day. The name waits for hydration, as the labels of `Calendar` do. */
	named: boolean
	onSelect: (date: Date) => void
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

/**
 * One day-grid cell: a `role="option"` button carrying selection, today, and
 * active state with a locale-resolved accessible name. Memoized so only cells
 * whose props change re-render as focus or selection moves. A press of a
 * disabled day picks nothing.
 *
 * @internal
 */
export const CalendarDayCell = memo(function CalendarDayCell({
	date,
	disabled,
	focusable,
	isToday,
	isActive,
	selected,
	variant,
	color,
	className,
	id,
	gridColumnStart,
	localeTag,
	named,
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
			aria-label={named ? formatDayName(date, localeTag) : undefined}
			aria-current={isToday ? 'date' : undefined}
			aria-disabled={ariaAttr(disabled && focusable)}
			data-disabled={dataAttr(disabled && focusable)}
			// The date picker reads the day of a focused cell from this ISO date.
			data-date={dayKey(date)}
			variant={variant ?? (selected ? 'solid' : isToday ? 'soft' : 'plain')}
			color={color ?? (selected || isToday ? 'blue' : undefined)}
			disabled={disabled && !focusable}
			onClick={handleClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={gridColumnStart ? { gridColumnStart } : undefined}
			className={cn(k().day.base, isActive && k().day.active, className)}
		>
			{formatInteger(date.getDate(), localeTag)}
		</Button>
	)
})
