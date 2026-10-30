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

		const board = element.closest<HTMLElement>('[data-slot="dashboard"]')

		queueMicrotask(() => {
			if (element.isConnected || !board?.isConnected) return

			if (document.activeElement !== null && document.activeElement !== document.body) return

			board.focus()
		})
	}
}
