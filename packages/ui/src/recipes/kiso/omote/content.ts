/**
 * Omote content: the content block of an app shell. A `card` block paints a
 * surface, a shadow, and rounded corners, and an outline under forced colors. A
 * `flat` block sits against the page. The two values write the same properties,
 * so a layout can switch between them at a breakpoint with a responsive axis.
 *
 * Each value also sets `--surface-fill` to the color under the content, so a
 * grid or a chart in the block paints the fill of the block.
 *
 * Layer: kiso · Concern: content block
 */

import { mode } from '../../../core/recipe'
import { sen } from '../sen'

import { bg } from './bg'

export const content = {
	flat: [
		...mode(
			['bg-transparent', '[--surface-fill:var(--color-white)]'],
			['dark:bg-transparent', 'dark:[--surface-fill:var(--color-zinc-950)]'],
		),
		'rounded-none',
		'shadow-none',
		'forced-colors:outline-none forced-colors:outline-0',
	].join(' '),
	card: [...bg.surface, 'rounded-lg', 'shadow-xs', sen.forced.outline].join(' '),
} as const
