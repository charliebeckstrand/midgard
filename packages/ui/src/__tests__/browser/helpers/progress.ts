import { bySlot } from '../../helpers'

/**
 * The fill ring of a `ProgressGauge`: the second circle, over the track.
 *
 * @throws When the gauge or its fill ring is not in `container`.
 */
export function gaugeFill(container: HTMLElement): SVGCircleElement {
	const ring = bySlot(container, 'progress-gauge')?.querySelectorAll('circle')[1]

	if (!ring) throw new Error('expected the fill ring')

	return ring
}

/**
 * The fill of a `ProgressBar`: the first child of the bar.
 *
 * @throws When the bar or its fill is not in `container`.
 */
export function barFill(container: HTMLElement): Element {
	const fill = bySlot(container, 'progress-bar')?.firstElementChild

	if (!fill) throw new Error('expected the fill')

	return fill
}
