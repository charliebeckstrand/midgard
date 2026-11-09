/**
 * The tallest a dialog is drawn at: the cap of its `align`, as a share of the
 * content box of the box around the panel.
 *
 * A floating panel stands in a box with an inset of 1rem on each edge, so its
 * `max-h-full` stops 1rem short of each edge of the screen. A docked panel has
 * no inset, and stops at its share of the screen.
 *
 * A `fit` panel reads it to know that it stands at its cap (`usePanelFit`).
 *
 * @internal
 */
export function dialogCeiling(panel: HTMLElement, viewport: number): number {
	const box = panel.parentElement

	const frame = box === null ? null : getComputedStyle(box)

	const room =
		frame === null
			? viewport
			: viewport - Number.parseFloat(frame.paddingTop) - Number.parseFloat(frame.paddingBottom)

	const maxHeight = getComputedStyle(panel).maxHeight

	// A browser can give the cap back as a share of the box, and not as pixels.
	const cap = maxHeight.endsWith('%')
		? (Number.parseFloat(maxHeight) / 100) * room
		: Number.parseFloat(maxHeight)

	return Number.isFinite(cap) ? Math.min(cap, room) : room
}
