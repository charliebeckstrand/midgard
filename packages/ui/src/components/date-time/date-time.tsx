'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { useDateFormat } from '../../providers/locale/use-date-format'
import { k } from '../../recipes/kata/date-time'
import { Placeholder } from '../placeholder'

/** Props for {@link DateTime}: the `value` to show and its `format`, over the `<time>` surface. */
export type DateTimeProps = Omit<ComponentProps<'time'>, 'dateTime' | 'children'> & {
	/** The instant to show: a `Date`, an ISO string, or a timestamp in milliseconds. */
	value: Date | string | number
	/**
	 * `Intl.DateTimeFormat` options. A `timeZone` here sets the zone for all
	 * renders.
	 *
	 * @defaultValue The `dateFormat` of the enclosing `LocaleProvider`, or the `Intl` default without one.
	 */
	format?: Intl.DateTimeFormatOptions
}

/**
 * An absolute date or time in a `<time>` element, in the locale of the nearest
 * `LocaleProvider`. It follows the time-zone rules of `useDateFormat`. A zone
 * from `format` or from the provider gives the text in each render. With no
 * zone, the date is in the zone of the reader, which the server does not know.
 * The server render and the hydration render then put a skeleton line in the
 * `<time>`, and the text comes after hydration. An invalid `value` renders an
 * empty `<span>`.
 *
 * @remarks A server component can render it, so a server page shows a date
 * with no client wrapper of its own. The skeleton line has the line height of
 * the inherited text, so the row keeps its height. Its width is an estimate.
 * @example
 * ```tsx
 * <DateTime value={user.created_at} format={{ dateStyle: 'medium' }} />
 * ```
 */
export function DateTime({ value, format, className, ...props }: DateTimeProps) {
	const formatter = useDateFormat(format)

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return <span data-slot="date-time" className={className} {...props} />
	}

	return (
		<time
			data-slot="date-time"
			dateTime={date.toISOString()}
			className={cn(formatter === undefined && k.pending, className)}
			{...props}
		>
			{formatter === undefined ? (
				<Placeholder as="span" className={k.skeleton.line} />
			) : (
				formatter.format(date)
			)}
		</time>
	)
}
