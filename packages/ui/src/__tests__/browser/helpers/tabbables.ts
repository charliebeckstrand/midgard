/**
 * Tab-order focusables inside a surface, in DOM order (the corpus authors no
 * positive tabindex, so DOM order is tab order). Real-browser-only:
 * `checkVisibility` needs a layout engine, which is also why the trap gate
 * lives in the browser suite.
 */
export function tabbables(surface: HTMLElement): HTMLElement[] {
	const candidates = surface.querySelectorAll<HTMLElement>(
		'a[href], button, input, select, textarea, [tabindex]',
	)

	return [...candidates].filter(
		(el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.checkVisibility(),
	)
}
