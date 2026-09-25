import { expect } from 'vitest'
import { fireEvent, frames, waitFor } from '../../helpers'
import { swallowsClicks } from '../../helpers/residue'

/**
 * Pointer drags for the browser cases that press and travel a real sensor.
 *
 * Browser-local rather than in the shared `__tests__/helpers` barrel, because
 * only the browser cases that travel a real layout use it. The jsdom suites
 * drive the dnd-kit sensors too. They lift a tile with the KeyboardSensor, or
 * they press the PointerSensor through `fireEvent`. Each such case moves the
 * pointer by a fixed distance, because jsdom lays nothing out, and it releases
 * the drag in its own body.
 */

/** A client-space point, as a pointer event carries it. */
export type Point = { x: number; y: number }

/** A press that is still down. The case asserts on it, then lets it go. */
export type HeldDrag = {
	/**
	 * Lifts the pointer where the path ended, then waits until the page takes
	 * clicks again.
	 */
	release: () => Promise<void>
}

/** The press a mouse's main button makes, unless the case states another. */
const PRIMARY: PointerEventInit = { isPrimary: true, button: 0 }

/**
 * Presses `node` at `from` and moves through `path`, one frame after each step.
 *
 * The gesture stays down until the case calls {@link HeldDrag.release}, so a
 * case can assert on the drag mid-flight. The release is the half that is easy
 * to forget, and it has a cost the case never sees.
 *
 * `@dnd-kit/core` adds a capture-phase `stopPropagation` to the document when a
 * drag activates. A `pointerup` detaches the sensor, and the listener goes one
 * timer later, in `AbstractPointerSensor.detach`. Both instances run
 * `isolate: false`, so one page serves every file. A drag that ends without
 * the wait hands the next file a page that drops every click.
 *
 * The residue guard fails a case that leaves the drag down, so a missed release
 * names its own case rather than the case after it.
 *
 * @param node - The node the press lands on, and the target of every later event.
 * @param from - Where the press lands.
 * @param path - The points the pointer moves through, in order.
 * @param init - Pointer state for every event of the gesture. The default is a
 * primary press, `{ isPrimary: true, button: 0 }`, and `init` overrides it.
 * @returns The held gesture.
 *
 * @example
 * ```typescript
 * const held = await drag(grip, { x: 60, y: 10 }, [{ x: 230, y: 10 }])
 *
 * expect(header).toHaveAttribute('data-dragging')
 *
 * await held.release()
 * ```
 */
export async function drag(
	node: Element,
	from: Point,
	path: Point[],
	init: PointerEventInit = {},
): Promise<HeldDrag> {
	const pointer = { ...PRIMARY, ...init }

	fireEvent.pointerDown(node, { ...pointer, clientX: from.x, clientY: from.y })

	for (const step of path) {
		fireEvent.pointerMove(node, { ...pointer, clientX: step.x, clientY: step.y })

		await frames()
	}

	const end = path.at(-1) ?? from

	return {
		release: async () => {
			fireEvent.pointerUp(node, { ...pointer, clientX: end.x, clientY: end.y })

			// The wait reads the page rather than holding 50ms of wall clock, so a
			// green run pays only the poll that finds the listener gone.
			await waitFor(() => expect(swallowsClicks()).toBe(false))
		},
	}
}
