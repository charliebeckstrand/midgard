import { maxHeightIn } from '../../utilities/measure-box'

/**
 * The tallest a dialog is drawn at: the cap of its `align`, in the height
 * between the insets of the panel.
 *
 * A floating panel has an inset of 1rem on each edge, and its cap is that
 * height, so it stops 1rem short of each edge of the screen. A docked panel
 * has no inset, and stops at its share of the screen. The cap of a floating
 * panel is a `calc()` that the browser can give back as a formula, and
 * `maxHeightIn` then gives the room, which is the same height.
 *
 * A `fit` panel reads it to know that it stands at its cap (`usePanelFit`).
 *
 * @internal
 */
export function dialogCeiling(panel: HTMLElement, viewport: number): number {
	const style = getComputedStyle(panel)

	const room = viewport - Number.parseFloat(style.top) - Number.parseFloat(style.bottom)

	return maxHeightIn(panel, room)
}
