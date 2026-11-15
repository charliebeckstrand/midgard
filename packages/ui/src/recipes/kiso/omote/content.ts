/**
 * Omote content: the content block of an app shell. A `card` block paints a
 * surface, a shadow, and rounded corners. A `flat` block sits against the page.
 * The two values write the same properties, so a layout can switch between
 * them at a breakpoint with a responsive axis.
 *
 * Each value also sets `--surface-fill` to the color under the content, so a
 * grid or a chart in the block paints the fill of the block.
 *
 * Layer: kiso · Concern: content block
 */

import { mode } from '../../../core/recipe'

import { bg } from './bg'

export const content = {
	flat: [
		...mode(
			['bg-transparent', '[--surface-fill:var(--color-white)]'],
			['dark:bg-transparent', 'dark:[--surface-fill:var(--color-zinc-950)]'],
		),
		'rounded-none',
		'shadow-none',
	].join(' '),
	card: [...bg.surface, 'rounded-lg', 'shadow-xs'].join(' '),
} as const
