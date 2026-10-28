'use client'

import { useEffect, useMemo, useState } from 'react'
import { clamp, getOrCompute } from '../../utilities'
import {
	DAY,
	HOUR,
	MAX_TIMEOUT,
	MINUTE,
	MONTH,
	SECOND,
	WEEK,
	YEAR,
} from '../../utilities/time-units'
import { subscribeTick } from './time-ago-ticker'

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

// `Intl.RelativeTimeFormat` construction is expensive; the cache holds one instance per locale.
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>()

function getFormatter(locale: string | undefined) {
	return getOrCompute(
		relativeTimeFormatCache,
		locale ?? '',
		() => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
	)
}

// Each unit's rollover is the rounded magnitude at which it becomes the next
// unit up. Bucketing on the *rounded* value (not the raw lower edge) keeps a
// value that rounds up from announcing "60 seconds"/"24 hours"/"7 days" ago.
const UNIT_STEPS: readonly { unit: Unit; ms: number; rollover: number }[] = [
	{ unit: 'second', ms: SECOND, rollover: 60 },
	{ unit: 'minute', ms: MINUTE, rollover: 60 },
	{ unit: 'hour', ms: HOUR, rollover: 24 },
	{ unit: 'day', ms: DAY, rollover: 7 },
	{ unit: 'week', ms: WEEK, rollover: Math.round(MONTH / WEEK) },
	{ unit: 'month', ms: MONTH, rollover: 12 },
	{ unit: 'year', ms: YEAR, rollover: Number.POSITIVE_INFINITY },
]

function pickUnit(absMs: number): { unit: Unit; value: number } {
	for (const { unit, ms, rollover } of UNIT_STEPS) {
		const value = absMs / ms

		if (Math.round(value) < rollover) return { unit, value }
	}

	// Unreachable: the year step's rollover is Infinity; the loop always
	// returns. The explicit fallback satisfies the type checker.
	return { unit: 'year', value: absMs / YEAR }
}

// Default text: the rounded magnitude in the unit `pickUnit` chooses, signed by `diffMs`.
function formatDefault(locale: string | undefined, diffMs: number): string {
	const { unit, value } = pickUnit(Math.abs(diffMs))

	return getFormatter(locale).format(Math.round(diffMs > 0 ? value : -value), unit)
}

function adaptiveInterval(absMs: number) {
	if (absMs < MINUTE) return 5 * SECOND

	if (absMs < HOUR) return 30 * SECOND

	if (absMs < DAY) return MINUTE

	if (absMs < WEEK) return HOUR

	return DAY
}

/**
 * Floor for an explicit numeric interval. `setInterval(fn, 0)` fires
 * continuously, and relative text never needs a refresh faster than a quarter
 * second.
 * @internal
 */
export const MIN_REFRESH_MS = 250

/**
 * Resolves the timer delay for `interval`. `'auto'` and a value that is not a
 * number, such as `NaN`, step with the age of the timestamp. A number clamps to
 * the range from {@link MIN_REFRESH_MS} to {@link MAX_TIMEOUT}, so
 * `Infinity` refreshes at the maximum delay.
 * @internal
 */
export function resolveRefreshInterval(interval: number | 'auto', absMs: number): number {
	if (typeof interval !== 'number' || Number.isNaN(interval)) return adaptiveInterval(absMs)

	return clamp(interval, MIN_REFRESH_MS, MAX_TIMEOUT)
}

type RelativeTimeOptions = {
	value: Date | string | number
	/** Override the default `Intl.RelativeTimeFormat` output. */
	format?: (diffMs: number, now: Date, then: Date) => string
	/** Locale for the default formatter. */
	locale?: string
	/**
	 * Refresh cadence in ms, or `'auto'` to step coarser as the timestamp ages.
	 * A number clamps to the range from {@link MIN_REFRESH_MS} to
	 * {@link MAX_TIMEOUT}. `NaN` steps the same as `'auto'`.
	 */
	interval?: number | 'auto'
}

type RelativeTimeResult = {
	/** The parsed target date. */
	then: Date
	/** Whether `value` parsed to a real timestamp. */
	valid: boolean
	/**
	 * Whether the text of a valid date waits for the clock of the reader. It is
	 * `true` on the server and in the hydration render, and `false` after the
	 * mount and for an invalid date.
	 */
	pending: boolean
	/** Formatted relative string; empty before mount or for an invalid date. */
	text: string
}

/**
 * Resolves a relative-time string for {@link TimeAgo}. It re-renders on a
 * refresh cadence that steps coarser as the timestamp ages, or on a fixed
 * `interval`.
 *
 * @returns The parsed date, a validity flag, a pending flag, and the formatted relative text.
 * @remarks
 * Client-only clock. `now` is `null` until a post-mount effect establishes it.
 * The first render on both server and client therefore emits empty `text`, and
 * hydration matches at unit boundaries. Picks the display unit by the rounded magnitude,
 * caches one `Intl.RelativeTimeFormat` per locale, and clamps an explicit
 * `interval` with {@link resolveRefreshInterval}.
 * @internal
 */
export function useTimeAgoRelativeTime({
	value,
	format,
	locale,
	interval = 'auto',
}: RelativeTimeOptions): RelativeTimeResult {
	// Client-only clock: null until mount. The first render (server and client)
	// produces no relative text; hydration matches at unit boundaries.
	const [now, setNow] = useState<Date | null>(null)

	const then = useMemo(() => (value instanceof Date ? value : new Date(value)), [value])

	const valid = !Number.isNaN(then.getTime())

	const diffMs = valid && now ? then.getTime() - now.getTime() : 0

	const absMs = Math.abs(diffMs)

	const intervalMs = resolveRefreshInterval(interval, absMs)

	useEffect(() => {
		if (!valid) return

		// Establishes the clock after mount, then refreshes on the computed cadence
		// through a shared per-cadence ticker (one timer for every same-cadence
		// TimeAgo on the page, paused while the tab is hidden).
		setNow(new Date())

		return subscribeTick(intervalMs, () => setNow(new Date()))
	}, [intervalMs, valid])

	if (!valid) return { then, valid, pending: false, text: '' }

	if (now === null) return { then, valid, pending: true, text: '' }

	const text = format ? format(diffMs, now, then) : formatDefault(locale, diffMs)

	return { then, valid, pending: false, text }
}
