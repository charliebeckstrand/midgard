/**
 * TimeAgo kata: a sheet. `base` is the `<time>` that holds the relative text,
 * `pending` is the `<time>` while it holds the skeleton line, and `skeleton`
 * is the line that stands in for the text until the mount.
 *
 * The skeleton line is an empty box, so it has no baseline. Its bottom edge
 * then sits on the baseline of the text, and the line box grows by the descent
 * of the text. Thus `pending` aligns the `<time>` to the top of the line, and
 * the line keeps the height of the text.
 */
import { kokkaku } from '../kiso'

export const k = {
	base: 'inline-flex w-fit shrink-0',
	pending: 'align-top',
	skeleton: kokkaku.timeAgo,
} as const
