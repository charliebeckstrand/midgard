'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useLocale } from '../../providers/locale'
import { useTimeAgoRelativeTime } from './use-time-ago-relative-time'

/** Props for {@link TimeAgo}: the `date` to age plus `format`/`locale`/`interval` overrides over the `<time>` surface. */
export type TimeAgoProps = Omit<ComponentProps<'time'>, 'dateTime' | 'children' | 'title'> & {
	date: Date | string | number
	/** Override the default `Intl.RelativeTimeFormat` output. */
	format?: (diffMs: number, now: Date, then: Date) => string
	/**
	 * Locale for the default formatter. Resolution order: explicit prop, then
	 * enclosing `LocaleProvider`, then the runtime default.
	 *
	 * @defaultValue The locale of the enclosing `LocaleProvider`, or the runtime default without one.
	 */
	locale?: string
	/**
	 * Refresh cadence in ms, or `'auto'` to step coarser as the timestamp ages.
	 * @defaultValue 'auto'
	 */
	interval?: number | 'auto'
}

/**
 * Self-refreshing relative timestamp rendered in a `<time>` element. Formats via
 * `Intl.RelativeTimeFormat`, and falls back to a plain `<span>` for invalid
 * dates. It steps its refresh `interval` coarser as the value ages.
 *
 * To show the absolute time in a tooltip, put TimeAgo in a `<TooltipTrigger>`
 * and give it `tabIndex={0}`. The `<time>` element takes no focus of its own, so
 * without `tabIndex` the tooltip opens on pointer hover only.
 *
 * @remarks
 * Client-only clock. The first render on both server and client emits an empty
 * `<time>`, with no relative text. The text then appears after mount, and
 * refreshes on the resolved interval. Lay out for the eventual text to avoid a
 * shift on hydrate.
 *
 * Hydration is deterministic only when `date` is the same value on the server
 * and on the client, because `dateTime` comes from `date`. A `date` that render
 * reads from `Date.now()` gives a hydration mismatch. Read the current time in
 * an effect, or pass a fixed timestamp.
 */
export function TimeAgo({
	date,
	format,
	locale,
	interval = 'auto',
	className,
	...props
}: TimeAgoProps) {
	const ambient = useLocale()

	const { then, valid, text } = useTimeAgoRelativeTime({
		date,
		format,
		locale: locale ?? ambient.locale,
		interval,
	})

	// An invalid date has no machine-readable timestamp; renders a plain <span>
	// rather than an empty <time> with no dateTime.
	if (!valid) return <span data-slot="time-ago" className={className} {...props} />

	return (
		<time
			data-slot="time-ago"
			dateTime={then.toISOString()}
			className={cn('inline-flex w-fit shrink-0', className)}
			{...props}
		>
			{text}
		</time>
	)
}
