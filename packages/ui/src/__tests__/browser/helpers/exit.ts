import { expect, vi } from 'vitest'
import { fireEvent, present, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/**
 * The two motion modes of an exit, as rows for `it.for`. Under reduced motion
 * a height or a scale snaps, but the fade runs, so the exit still occurs.
 */
export const EXIT_MOTION_CASES = [
	{ reduced: false, name: 'the full exit' },
	{ reduced: true, name: 'the reduced exit' },
] as const

/** The focused element. It throws when no element has the focus. */
export const focusedElement = () => present(document.activeElement, 'the focused element')

/** Whether a press at the center of `element` lands on it or inside it. */
export function hits(element: Element): boolean {
	const at = getCenter(element)

	return element.contains(document.elementFromPoint(at.x, at.y))
}

/**
 * Asserts that `panel` is still on screen, and that it takes no input.
 *
 * @param panel - The panel in its exit.
 * @param options - `options` also asserts that a press at each option of the
 * panel lands on what lies under the panel.
 */
export const expectExiting = vi.defineHelper(
	(panel: HTMLElement, { options = false }: { options?: boolean } = {}) => {
		expect(panel).toBeInTheDocument()

		expect(panel.closest('[inert]')).not.toBeNull()

		expect(panel).not.toContainElement(focusedElement())

		if (!options) return

		for (const option of panel.querySelectorAll('[role="option"]')) expect(hits(option)).toBe(false)
	},
)

/** Waits until the exit of `element` ends and the element leaves the document. */
export const gone = (element: HTMLElement) => waitFor(() => expect(element).not.toBeInTheDocument())

/** The group that a branch row of a tree owns through `aria-owns`. */
export function getGroup(branch: HTMLElement): HTMLElement {
	return present(document.getElementById(branch.getAttribute('aria-owns') ?? ''), 'group')
}

/**
 * Sends a key down to the focused row with `fireEvent`. The event commits in
 * the same task, so the next check runs inside the exit.
 */
export function pressKey(key: string): void {
	fireEvent.keyDown(present(document.activeElement, 'focused row'), { key })
}
