import type { MouseEvent } from 'react'

/**
 * Cancels the focus move of a press on a button in the row, or on the empty
 * part of the row. `ControlActions` puts it on its row, and a row that
 * is not a ControlActions, such as the toolbar of a Wysiwyg, puts it on its
 * own element.
 *
 * @internal
 */
export function keepFocusOnPress(event: MouseEvent<HTMLElement>) {
	if (!(event.target instanceof Element)) return

	if (event.target === event.currentTarget) {
		event.preventDefault()

		return
	}

	const button = event.target.closest('button, [role="button"]')

	if (button && event.currentTarget.contains(button)) event.preventDefault()
}
