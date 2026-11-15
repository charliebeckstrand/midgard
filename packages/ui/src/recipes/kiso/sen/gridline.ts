/**
 * Sen gridline: the color of the cell rules of a table, in the three outline
 * weights of `sen.outline`. The `<table>` casts each color onto its cells, so
 * the cells read no context. The color is an all-sides `border-color`. The
 * kata that reads it sets the border widths, so it decides which sides show.
 *
 * Tailwind finds only whole class literals. Thus these rows cannot be built
 * from the unprefixed `sen.outline` colors and the `contrastMore.border` step
 * that they mirror. Keep them in step by hand.
 *
 * Layer: kiso · Concern: table cell rules
 */

import { mode } from '../../../core/recipe'

export const gridline = {
	/** Default rule: low-contrast palette, as `sen.outline.default`. */
	default: [
		...mode(
			[
				'[&>*>tr>:is(td,th)]:border-zinc-950/10',
				'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
			],
			[
				'dark:[&>*>tr>:is(td,th)]:border-white/10',
				'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
			],
		),
	],
	/** Stronger rule, as `sen.outline.strong`. */
	strong: [
		...mode(
			[
				'[&>*>tr>:is(td,th)]:border-zinc-950/15',
				'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
			],
			[
				'dark:[&>*>tr>:is(td,th)]:border-white/15',
				'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
			],
		),
	],
	/** Subtle rule, as `sen.outline.subtle`. */
	subtle: [
		...mode(
			[
				'[&>*>tr>:is(td,th)]:border-zinc-950/5',
				'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
			],
			[
				'dark:[&>*>tr>:is(td,th)]:border-white/5',
				'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
			],
		),
	],
} as const
