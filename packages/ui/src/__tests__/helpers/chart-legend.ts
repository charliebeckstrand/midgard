/**
 * The legend switch of a chart series or a pie row.
 *
 * @param container - The subtree that holds the chart.
 * @param name - Text in the label of the switch.
 * @returns The first `chart-legend-item` button whose text holds `name`.
 * @throws When no legend switch holds `name`.
 */
export function legendItem(container: HTMLElement, name: string): HTMLButtonElement {
	const item = [
		...container.querySelectorAll<HTMLButtonElement>('button[data-slot="chart-legend-item"]'),
	].find((button) => button.textContent?.includes(name))

	if (!item) throw new Error(`expected the legend item ${name}`)

	return item
}
