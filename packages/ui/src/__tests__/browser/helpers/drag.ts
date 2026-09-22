import { expect } from 'vitest'
import { fireEvent, waitFor } from '../../helpers'
import { swallowsClicks } from '../../helpers/residue'

/**
 * Ending a real pointer drag, for the browser cases that start one.
 *
 * Browser-local rather than in the shared `__tests__/helpers` barrel: jsdom
 * drives no dnd-kit sensor, so no case outside this suite holds a live drag.
 */

/**
 * Releases the pointer and waits until the page takes clicks again.
 *
 * `@dnd-kit/core` adds a capture-phase `stopPropagation` to the document when a
 * drag activates. A `pointerup` detaches the sensor, and the listener itself
 * goes one timer later — `setTimeout(documentListeners.removeAll, 50)` in
 * `AbstractPointerSensor.detach`. A case that ends on the release alone hands
 * the next case a page that drops every click, because both instances run
 * `isolate: false` and one page serves every file.
 *
 * That gap is the root cause of the suite's intermittent failure: the victim is
 * whichever click-driven case lands inside the window, which moves with the
 * file order and the machine.
 *
 * The wait reads {@link swallowsClicks} rather than holding 50ms of wall clock,
 * so a green run pays only the poll that finds the listener gone.
 *
 * @param node - The node the drag pressed.
 * @param init - Pointer state for the release, where the case states one.
 *
 * @example
 * ```typescript
 * fireEvent.pointerDown(grip, { isPrimary: true, button: 0 })
 *
 * fireEvent.pointerMove(grip, { clientX: 70 })
 *
 * await releaseDrag(grip)
 * ```
 */
export async function releaseDrag(node: Element, init?: PointerEventInit): Promise<void> {
	fireEvent.pointerUp(node, init)

	await waitFor(() => expect(swallowsClicks()).toBe(false))
}
