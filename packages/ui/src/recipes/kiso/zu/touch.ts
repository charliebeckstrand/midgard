/**
 * Zu touch: the touch posture of a readout surface that the chart and map
 * modules share. A hold on a chart, a heatmap, a choropleth, or a map plot
 * opens a readout, so the two modules hold one posture.
 *
 * Layer: kiso · Concern: touch
 */

export const touch = {
	/**
	 * The root of a readout surface: a chart, a heatmap, a choropleth, or a map
	 * plot. A long press opens the readout on a map. The surface selects no text
	 * and opens no callout under a hold. Safari on iOS can select text in a
	 * descendant of a `select-none` box, so every descendant also sets it.
	 */
	readout: ['select-none', '**:select-none', '[-webkit-touch-callout:none]'],
} as const
