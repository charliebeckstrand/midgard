/**
 * Kokkaku skeleton: chart. A chart takes its height from its width, and
 * density does not change that height. So the skeleton reserves the ratio of
 * the chart, not a height for each step.
 *
 * The `aspect` block takes the full width, and an inline `aspect-ratio` gives
 * the height. The `sector` column holds the square plot of a pie or a donut
 * and the legend row below it, at the gap of the chart root. The legend row
 * has the height of a `sm` button, as the legend controls do. The `base`
 * block is the form with no ratio: full width at the height of the step.
 *
 * The `box` placeholder fills the plot box of a chart frame until the box has
 * a width. The plot box sets the size, so the placeholder sets none. A pie or
 * a donut puts the `disc` in a `discBox` instead: a size container that centers
 * the largest circle that the plot box holds.
 *
 * Layer: kiso · Concern: skeleton form · Unit: chart
 */

import { dan } from '../dan'
import { kasane } from '../kasane'
import { button } from './button'

const { rounded } = kasane

export const chart = {
	base: ['block', 'w-full', rounded.md, dan.size.chart],
	aspect: ['block', 'w-full', 'h-auto', rounded.md],
	sector: ['flex', 'w-full', 'flex-col', 'gap-3'],
	plot: ['block', 'aspect-square', 'w-full', 'h-auto', 'rounded-full'],
	legend: ['self-center', 'w-48', 'max-w-full', rounded.lg, button.height],
	box: ['absolute', 'inset-0', 'size-full', rounded.md],
	discBox: ['absolute', 'inset-0', '@container-size', 'grid', 'place-items-center'],
	disc: ['size-[100cqmin]', 'rounded-full'],
	density: true,
} as const
