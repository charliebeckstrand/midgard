'use client'

import type { ComponentProps } from 'react'
import { useDateFormat } from '../../providers/locale'

/** Props for {@link DateTime}: the `value` to show and its `format`, over the `<time>` surface. */
export type DateTimeProps = Omit<ComponentProps<'time'>, 'dateTime' | 'children'> & {
	/** The instant to show: a `Date`, an ISO string, or a timestamp in milliseconds. */
	value: Date | string | number
	/**
	 * `Intl.DateTimeFormat` options. A `timeZone` here fixes the zone for all
	 * renders.
	 *
	 * @defaultValue The `dateFormat` of the enclosing `LocaleProvider`, or the `Intl` default without one.
	 */
	format?: Intl.DateTimeFormatOptions
}

/**
 * An absolute date or time in a `<time>` element, in the locale of the nearest
 * `LocaleProvider`. It follows the time-zone rules of `useDateFormat`. The
 * server render and the hydration render use the `timeZone` of the provider,
 * and a format that shows a time adds the name of the zone. The render after
 * hydration uses the zone of the reader. An invalid `value` renders an empty
 * `<span>`.
 *
 * @remarks A server component can render it, so a server page shows a date
 * with no client wrapper of its own.
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
		<time data-slot="date-time" dateTime={date.toISOString()} className={className} {...props}>
			{formatter.format(date)}
		</time>
	)
}
