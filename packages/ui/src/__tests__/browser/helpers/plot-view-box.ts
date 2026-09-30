import { getSlot } from '../../helpers'

/**
 * Gives the `viewBox` of the SVG inside the element that `slot` anchors in
 * `container`.
 *
 * @throws If the anchored element holds no SVG.
 */
export function plotViewBox(container: HTMLElement, slot: string): SVGRect {
	const svg = getSlot(container, slot).querySelector('svg')

	if (!svg) throw new Error(`no SVG in [data-slot="${slot}"]`)

	return svg.viewBox.baseVal
}
