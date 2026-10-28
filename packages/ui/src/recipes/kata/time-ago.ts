/**
 * TimeAgo kata: a sheet. `base` is the `<time>` that holds the relative text,
 * and `skeleton` is the line that stands in for the text until the mount.
 */
import { kokkaku } from '../kiso'

export const k = {
	base: 'inline-flex w-fit shrink-0',
	skeleton: kokkaku.timeAgo,
} as const
