import { onTestFinished } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density/steps.ts'

/** The stylesheet links that React puts in the head for a `precedence`. */
const HOISTED_STYLESHEET = 'link[rel="stylesheet"][data-precedence]'

/**
 * Puts back the theme class and the density step that `AppearanceProvider`
 * writes to the root element and does not remove on unmount. The window is
 * shared across the files of a worker, so a step left on the root would reach
 * a later file that reads it.
 *
 * It also removes the stylesheet link of the shell (`app/root.tsx`). React
 * puts the link in the head and keeps it there after the unmount, as for each
 * stylesheet with a `precedence`.
 */
export function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = readRootDensity(root)

	const dark = root.classList.contains('dark')

	const stylesheets = new Set(document.head.querySelectorAll(HOISTED_STYLESHEET))

	onTestFinished(() => {
		writeRootDensity(root, density)

		root.classList.toggle('dark', dark)

		for (const link of document.head.querySelectorAll(HOISTED_STYLESHEET)) {
			if (!stylesheets.has(link)) link.remove()
		}
	})
}
