import { focusDropped } from '../../utilities/focus-dropped'

/** The root of a board, which takes the focus when no grip can. @internal */
const BOARD_SELECTOR = '[data-slot="dashboard"]'

/** The drag grip of a tile. @internal */
const GRIP_SELECTOR = '[data-slot="dashboard-handle"]'

/**
 * The ref of an edit-only control of a tile: the grip, a splitter, or the
 * duplicate or remove control. When the control unmounts with the focus, for
 * example when edit mode ends, the focus goes to the board. It therefore never
 * falls to the page.
 *
 * @remarks
 * React runs the cleanup of a ref before it removes the element, so the cleanup
 * can see that the element holds the focus. The focus moves in a microtask,
 * after the commit, and only when the element left the page and nothing else
 * took the focus. A ref that React attaches again thus keeps its focus. The
 * remove control gives the focus to a grip before the tile goes, so this does
 * nothing then.
 *
 * @internal
 */
export function keepFocusOnBoard(element: HTMLElement | null): (() => void) | undefined {
	if (element === null) return undefined

	return () => {
		if (!element.contains(document.activeElement)) return

		const board = element.closest<HTMLElement>(BOARD_SELECTOR)

		queueMicrotask(() => {
			if (element.isConnected || !board?.isConnected) return

			if (!focusDropped()) return

			board.focus()
		})
	}
}

/**
 * Moves the focus to the grip of the first tile in `tiles` that shows one, else
 * to the board that holds `within`. The focus therefore never falls to the page.
 *
 * @internal
 */
export function focusGripOrBoard(tiles: readonly HTMLElement[], within: HTMLElement): void {
	const grip = tiles
		.map((tile) => tile.querySelector<HTMLElement>(GRIP_SELECTOR))
		.find((element) => element !== null)

	;(grip ?? within.closest<HTMLElement>(BOARD_SELECTOR))?.focus()
}
