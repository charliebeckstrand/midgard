'use client'

import type { ComponentProps } from 'react'
import { useLocale } from '../../providers/locale/context'
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
 * The server render and the hydration render then put a skeleton in the
 * `<time>`, and the text comes after hydration. An invalid `value` renders an
 * empty `<span>`.
 *
 * @remarks A server component can render it, so a server page shows a date
 * with no client wrapper of its own. The skeleton holds the same date in UTC,
 * in the same format, as text that does not show. Thus the skeleton has the
 * length, the line breaks, and the baseline of the text that replaces it. Only
 * the characters that the zone changes can change the width.
 * @example
 * ```tsx
 * <DateTime value={user.created_at} format={{ dateStyle: 'medium' }} />
 * ```
 */
export function DateTime({ value, format, className, ...props }: DateTimeProps) {
	const formatter = useDateFormat(format)

	const { dateFormat } = useLocale()

	// The text in UTC is the same in the server render and in the hydration
	// render, so it can give the skeleton its size.
	const stand = useDateFormat({ ...(format ?? dateFormat), timeZone: 'UTC' })

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return <span data-slot="date-time" className={className} {...props} />
	}

	return (
		<time data-slot="date-time" dateTime={date.toISOString()} className={className} {...props}>
			{formatter === undefined ? (
				<Placeholder as="span" className={k.skeleton.text}>
					{stand.format(date)}
				</Placeholder>
			) : (
				formatter.format(date)
			)}
		</time>
	)
}
