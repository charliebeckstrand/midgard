/**
 * DateTime kata: a sheet. `pending` is the `<time>` while it holds the
 * skeleton line, and `skeleton` is the line that stands in for the date until
 * the zone of the reader is known.
 */
import { kokkaku } from '../kiso'

export const k = {
	pending: 'inline-flex w-fit shrink-0',
	skeleton: kokkaku.dateTime,
} as const
