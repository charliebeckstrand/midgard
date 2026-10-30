import { fireEvent, present } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/** A press on a column resize handle that is still down. */
export type HeldResize = {
	/** Moves the pointer `dx` px along the x axis from the press. */
	move: (dx: number) => void
	/** Lifts the pointer where the last move put it. */
	release: () => void
}

/**
 * The resize handle of the Grid column with the header `label`.
 *
 * @param root - The node that holds the grid.
 * @param label - The title of the column, as the `aria-label` of the handle names it.
 */
export function resizeHandle(root: ParentNode, label: string): HTMLElement {
	return present(
		root.querySelector<HTMLElement>(`hr[aria-label="Resize ${label}"]`),
		`Resize ${label}`,
	)
}

/**
 * Presses the mouse at the center of a column resize handle.
 *
 * The handle takes the press, and the document takes each later move and the
 * release, as the resize listens there. The press stays down until the case
 * calls `release`, so a case can assert on the drag while it is open.
 *
 * @param handle - The handle, from {@link resizeHandle}.
 * @returns The held press.
 */
export function pressResize(handle: Element): HeldResize {
	const { x, y } = getCenter(handle)

	let clientX = x

	fireEvent.mouseDown(handle, { clientX, clientY: y })

	return {
		move: (dx) => {
			clientX = x + dx

			fireEvent.mouseMove(document, { clientX, clientY: y })
		},
		release: () => {
			fireEvent.mouseUp(document, { clientX, clientY: y })
		},
	}
}

/**
 * Drags a column resize handle `dx` px along the x axis and releases it. A `dx`
 * of 0 presses and releases the handle with no move.
 *
 * @param handle - The handle, from {@link resizeHandle}.
 * @param dx - The distance in px. A negative value moves to the physical left.
 */
export function dragResize(handle: Element, dx: number): void {
	const held = pressResize(handle)

	if (dx !== 0) held.move(dx)

	held.release()
}
