import { fireEvent } from '@testing-library/react'

/**
 * Presses and releases the primary mouse button on `node`, with the events in the order that the
 * browser sends them: `mousedown`, `mouseup`, and `click`.
 *
 * @remarks The click of a mouse has `detail: 1`. A bare `fireEvent.click` sends `detail: 0`,
 * which is the click that a key press on a button causes. Use this helper where the code under
 * test reads the press and the click apart, such as a control that acts on the release.
 *
 * @param node - The node that the press and the release land on.
 * @param init - Mouse state for each of the three events.
 */
export function mouseClick(node: Element, init: MouseEventInit = {}): void {
	fireEvent.mouseDown(node, init)

	fireEvent.mouseUp(node, init)

	fireEvent.click(node, { detail: 1, ...init })
}
