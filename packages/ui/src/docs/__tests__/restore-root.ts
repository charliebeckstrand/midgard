import { onTestFinished } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density/steps.ts'

/**
 * Puts back the theme class and the density step that `AppearanceProvider`
 * writes to the root element and does not remove on unmount. The window is
 * shared across the files of a worker, so a step left on the root would reach
 * a later file that reads it.
 */
export function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = readRootDensity(root)

	const dark = root.classList.contains('dark')

	onTestFinished(() => {
		writeRootDensity(root, density)

		root.classList.toggle('dark', dark)
	})
}
