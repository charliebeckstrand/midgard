'use client'

import type { ComponentProps } from 'react'
import { useLocale } from '../../providers/locale/context'
import { useDateFormat } from '../../providers/locale/use-date-format'
import type { DateText } from '../../server/date-text'
import { DateTimePending } from './date-time-pending'
import { standText } from './date-time-stand'

/** Whether `value` is the text that a server wrote. */
function isDateText(value: DateTimeProps['value']): value is DateText {
	return typeof value === 'object' && !(value instanceof Date)
}

/** Props for {@link DateTime}: the `value` to show and its `format`, over the `<time>` surface. */
export type DateTimeProps = Omit<ComponentProps<'time'>, 'dateTime' | 'children'> & {
	/**
	 * The instant to show: a `Date`, an ISO string, or a timestamp in
	 * milliseconds. A `DateText` from `formatDateText` in `ui/server` gives the
	 * text that the server wrote, and the component shows that text in each
	 * render.
	 */
	value: Date | string | number | DateText
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
 * `LocaleProvider`. It follows the rules of `useDateFormat`: a `timeZone` in
 * `format`, else the zone of the provider, else the zone of the reader. The
 * browser writes the text, after hydration. The server render and the
 * hydration render put a skeleton in the `<time>`. A `DateText` value shows
 * the text of the server in each render, with no skeleton, and `format` does
 * not apply. An invalid `value` renders an empty `<span>`.
 *
 * @remarks A server component can render it, so a server page shows a date
 * with no client wrapper of its own.
 *
 * The text of `Intl` comes from the date data of the JavaScript engine, and
 * two engines can write different text for one format, such as Node on the
 * server and Safari in the browser. So the text waits for the browser also
 * when the zone is set. Text from the server would differ from the text of the
 * hydration render in such a browser, and React would then render the tree
 * again from the start. A page that must paint a date in its first frame
 * writes it with `formatDateText` on the server and passes the `DateText`.
 *
 * The skeleton holds the date in UTC as text that does not show, in the shape
 * of English text for the format, which the code writes without `Intl` (see
 * `standText`). Thus the skeleton has about the length, the line breaks, and
 * the baseline of the text that replaces it.
 *
 * @example
 * ```tsx
 * <DateTime value={user.created_at} format={{ dateStyle: 'medium' }} />
 * ```
 */
export function DateTime({ value, format, className, ...props }: DateTimeProps) {
	const formatter = useDateFormat(format)

	const { dateFormat } = useLocale()

	if (isDateText(value)) {
		return (
			<time data-slot="date-time" dateTime={value.at} className={className} {...props}>
				{value.text}
			</time>
		)
	}

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return <span data-slot="date-time" className={className} {...props} />
	}

	return (
		<time data-slot="date-time" dateTime={date.toISOString()} className={className} {...props}>
			{formatter === undefined ? (
				<DateTimePending>{standText(date, format ?? dateFormat ?? {})}</DateTimePending>
			) : (
				formatter.format(date)
			)}
		</time>
	)
}
