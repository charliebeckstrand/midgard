/**
 * TimeAgo kata: the unit of the `<time>` that holds the relative text. The
 * `skeleton` line stands in for the text until the mount.
 */
import { defineKata } from '../../core/recipe'
import { kokkaku } from '../kiso'

export const k = defineKata(
	{
		base: 'inline-flex w-fit shrink-0',
		/**
		 * The `<time>` while it holds the skeleton line. The line is an empty box,
		 * so it has no baseline. Its bottom edge then sits on the baseline of the
		 * text, and the line box grows by the descent of the text. Thus the
		 * `<time>` aligns to the top of the line, and the line keeps the height of
		 * the text.
		 */
		pending: { true: 'align-top', false: '' },
		defaults: { pending: false },
	},
	{ skeleton: kokkaku.timeAgo },
)
