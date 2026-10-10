import { CATEGORY_VALUES } from '../constants'
import type { PlaceCategory } from '../types'

/**
 * The field readers that the client edges use. Mimir, in asgard, validates each
 * place that the app sends. The address codec must not trust a link, and the
 * form must refuse what Mimir refuses, so these readers apply the same rules.
 */

/** One of the categories a place can carry. */
export function isCategory(value: unknown): value is PlaceCategory {
	return CATEGORY_VALUES.includes(value as PlaceCategory)
}

/**
 * A `YYYY-MM-DD` day, which is the granularity a visit is recorded at.
 *
 * The shape and the date both: `2026-13-45` is a well-formed field and not a
 * day, and a reader can type one into the address bar.
 */
export function isDay(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

	// `Date.parse` rolls `2026-02-31` over to March 3, so compare the day it reads back.
	const date = new Date(`${value}T00:00:00Z`)

	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/**
 * Whether a string is an absolute http(s) address. The form uses it, so that it
 * refuses the same addresses that Mimir refuses.
 */
export function isWebAddress(value: string): boolean {
	try {
		const url = new URL(value)

		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

/**
 * Whether a string is a web address that can open: an absolute http(s) address
 * with a host that ends in a top-level domain. A host such as `localhost`, an
 * IP address, or `example.` has no top-level domain, so the form does not
 * offer to open it.
 */
export function isWebsite(value: string): boolean {
	if (!isWebAddress(value)) return false

	return /\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/i.test(new URL(value).hostname)
}
