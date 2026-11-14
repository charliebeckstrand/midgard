/**
 * Zu ink: the chrome and readout inks the chart and map modules share. The
 * gridline and the axis baseline rule a chart's plot and a map's frame, so a
 * dashboard rules both in one ink. The label and value inks set the legend and
 * tooltip text beside the marks. The selection ink rings a picked mark in both
 * modules.
 *
 * Layer: kiso · Concern: ink
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
	/**
	 * The one selection ink of data-viz marks: a picked map region or overlay
	 * mark, and a picked or pointed heatmap cell. Foreground ink, not a palette
	 * slot. A mark in one of the eight categorical hues would read as a ninth
	 * category. The neutral holds its contrast over every slot, over each stop of
	 * a sequential scale, and over the no-data fill.
	 */
	selected: mode('stroke-zinc-900', 'dark:stroke-white'),
	/**
	 * A stroke in the fill of the surface under the mark: the halo of a chart dot
	 * and the seam between two map regions, so the stroke reads as a gap. It reads
	 * `--surface-fill`, which a surface card and the content host of the sidebar
	 * layout set. Without either, it takes the page ground.
	 */
	surface: mode(
		'stroke-(--surface-fill,var(--color-white))',
		'dark:stroke-(--surface-fill,var(--color-zinc-950))',
	),
	/** Legend / tooltip label ink (HTML text; marks carry the color, text never does). */
	label: ['text-sm text-start', 'leading-tight', ...text.muted],
	/** Tooltip value ink: the strong element, values lead. */
	value: ['text-xs', 'tabular-nums', 'font-medium', ...text.default],
} as const
