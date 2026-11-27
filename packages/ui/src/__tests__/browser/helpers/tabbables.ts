/**
 * Whether a Tab can stop on `radio`, a native radio. A Tab stops on one radio of a named group:
 * the checked radio, or the first radio of the group when no radio is checked. The arrow keys
 * move between the radios of the group.
 */
function isRadioStop(radio: HTMLInputElement): boolean {
	if (!radio.name) return true

	const group = [
		...(radio.form ?? radio.ownerDocument).querySelectorAll<HTMLInputElement>(
			`input[type="radio"][name="${CSS.escape(radio.name)}"]`,
		),
	].filter((other) => other.form === radio.form)

	const checked = group.find((other) => other.checked)

	return radio === (checked ?? group[0])
}

/**
 * Tab-order focusables inside a surface, in DOM order (the corpus authors no
 * positive tabindex, so DOM order is tab order). An element in an `inert`
 * subtree takes no focus, so it is not a stop, and a native radio is a stop
 * only when a Tab stops on it ({@link isRadioStop}). Real-browser-only:
 * `checkVisibility` needs a layout engine, which is also why the trap gate
 * lives in the browser suite.
 */
export function tabbables(surface: HTMLElement): HTMLElement[] {
	const candidates = surface.querySelectorAll<HTMLElement>(
		'a[href], button, input, select, textarea, [tabindex]',
	)

	return [...candidates].filter(
		(candidate) =>
			candidate.tabIndex >= 0 &&
			!candidate.matches(':disabled') &&
			!candidate.closest('[inert]') &&
			!(
				candidate instanceof HTMLInputElement &&
				candidate.type === 'radio' &&
				!isRadioStop(candidate)
			) &&
			candidate.checkVisibility(),
	)
}
