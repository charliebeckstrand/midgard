import { fireEvent } from '@testing-library/react'

/** A mouse button that is still down. The case asserts on it, then lets it go. */
export type HeldMouse = {
	/** Lifts the button on the document, where a mouse-drag engine listens for the end. */
	release: (init?: MouseEventInit) => void
}

/**
 * Presses a mouse button on `node` and keeps it down.
 *
 * A mouse-drag engine starts on `mousedown` at the node and then listens on the
 * document for `mousemove` and `mouseup`. `@tanstack/table-core`'s column
 * resize is one: it adds both listeners on the press and removes them on the
 * release. A case that presses and never releases leaves them on the document,
 * and the jsdom `unit` project shares one window across every file a worker
 * runs, so the next file's mouse moves reach a column that is gone.
 *
 * The residue guard fails a case that leaves such a listener, so a missed
 * release names its own case rather than the case after it.
 *
 * @param node - The node the press lands on.
 * @param init - Mouse state for the press, and for the release unless it states its own.
 * @returns The held button.
 *
 * @example
 * ```typescript
 * const held = holdMouse(handle, { button: 0, clientX: 200 })
 *
 * expect(handle).toHaveAttribute('data-resizing')
 *
 * held.release()
 * ```
 */
export function holdMouse(node: Element, init: MouseEventInit = {}): HeldMouse {
	fireEvent.mouseDown(node, init)

	return {
		release: (at = init) => {
			fireEvent.mouseUp(document, at)
		},
	}
}
