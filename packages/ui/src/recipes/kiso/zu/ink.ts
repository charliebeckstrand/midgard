/**
 * Zu ink: the chrome and readout inks the chart and map modules share. The
 * gridline and the axis baseline rule a chart's plot and a map's frame, so a
 * dashboard rules both in one ink. The label and value inks set the legend and
 * tooltip text beside the marks.
 *
 * Layer: kiso · Archetype: zu · Concern: ink
 */

import { mode } from '../../../core/recipe'
import { iro } from '../iro'

const { text } = iro

export const ink = {
	/** Hairline gridlines, one step off the surface. A map's graticule takes it too. */
	grid: mode('stroke-zinc-200', 'dark:stroke-zinc-800'),
	axis: {
		/** The axis baseline, a step firmer than the grid. A map's sphere outline takes it too. */
		line: mode('stroke-zinc-300', 'dark:stroke-zinc-700'),
	},
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ['text-sm text-start', 'leading-tight', ...text.muted],
	/** Tooltip value ink: the strong element, values lead. */
	value: ['text-xs', 'tabular-nums', 'font-medium', ...text.default],
} as const
