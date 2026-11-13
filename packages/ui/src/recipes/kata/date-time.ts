/**
 * DateTime kata: a sheet. `pending` is the `<time>` while it holds the
 * skeleton line, and `skeleton` is the line that stands in for the date until
 * the zone of the reader is known.
 *
 * The skeleton line is an empty box, so it has no baseline. Its bottom edge
 * then sits on the baseline of the text, and the line box grows by the descent
 * of the text. Thus `pending` aligns the `<time>` to the top of the line, and
 * the line keeps the height of the text.
 */
import { kokkaku } from '../kiso'

export const k = {
	pending: 'inline-flex w-fit shrink-0 align-top',
	skeleton: kokkaku.dateTime,
} as const
