import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/calendar'
import { rangeKeys } from '../../utilities'
import { Placeholder, type SkeletonProps } from '../placeholder'

/** Props for {@link CalendarSkeleton}; the size-stepped skeleton surface. */
export type CalendarSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/**
 * One cell for each day of the week. The browser rounds the width of each
 * column apart, and the row takes the height of its tallest square cell, so
 * the skeleton draws all seven, as the real row does.
 */
const weekdays = rangeKeys(7, 'weekday')

/** The day rows of a month that spans six weeks, the tallest month a calendar draws. */
const dayRows = rangeKeys(6, 'week')

/**
 * Calendar-shaped loading placeholder: one block over empty rows that have the
 * structure of the real month grid. The header row, the square weekday row, and
 * six day rows come from the calendar recipes, so the block has the box of a
 * real calendar at each step. Compose it in loading trees in place of
 * `<Calendar>`.
 *
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Calendar}
 */
export function CalendarSkeleton({ size, className }: CalendarSkeletonProps) {
	return (
		<div data-density={size} aria-hidden="true" className={cn(k.base, 'relative', className)}>
			<Placeholder className="absolute inset-0 size-full" />

			<div className={cn(k.header, k.skeleton.row)} />

			<div className={k.grid}>
				{weekdays.map((weekdayKey) => (
					<div key={weekdayKey} className={cn(k.weekday)} />
				))}

				{dayRows.map((rowKey) => (
					<div key={rowKey} className={cn('col-span-7', k.skeleton.row)} />
				))}
			</div>
		</div>
	)
}
