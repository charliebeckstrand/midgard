import { getSlot } from './slot-queries'

/**
 * Gives the tick label nodes of one chart axis, in draw order.
 *
 * @param container - The subtree that holds the chart.
 * @param slot - The `data-slot` of the axis group, such as `chart-axis-y`.
 * @returns Each `text` node of the axis group.
 * @throws If no axis group has that slot.
 */
export function axisTexts(container: HTMLElement, slot: string): SVGTextElement[] {
	return [...getSlot(container, slot).querySelectorAll('text')]
}

/**
 * Gives the text of each tick label of one chart axis, in draw order.
 *
 * @param container - The subtree that holds the chart.
 * @param slot - The `data-slot` of the axis group, such as `chart-axis-y`.
 * @returns The text of each label.
 * @throws If no axis group has that slot.
 */
export function axisLabels(container: HTMLElement, slot: string): string[] {
	return axisTexts(container, slot).map((text) => text.textContent ?? '')
}

/**
 * Gives the number of each numeric tick label of one chart axis, in draw order.
 * The parse keeps the digits, the point, and the minus sign of a label, so a
 * currency or a unit does not stop it. A label with no number is not in the
 * result.
 *
 * @param container - The subtree that holds the chart.
 * @param slot - The `data-slot` of the axis group, such as `chart-axis-y`.
 * @returns The number of each numeric label.
 * @throws If no axis group has that slot.
 */
export function axisValues(container: HTMLElement, slot: string): number[] {
	return axisLabels(container, slot)
		.map((label) => Number(label.replace(/[^\d.-]/g, '')))
		.filter(Number.isFinite)
}
