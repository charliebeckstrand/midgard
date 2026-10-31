import { onTestFinished } from 'vitest'
import { type DensityStep, writeRootDensity } from '../../../core/density'

/**
 * Adds the class `name` to the root element for the current test. The class goes off when the
 * test finishes.
 *
 * @remarks
 * The class of the root element is shared state, and the residue guard only reports a class that
 * stays. The removal runs in `onTestFinished`, so it also runs after a case that fails or times
 * out.
 *
 * @param name - The class to add, such as `dark`.
 */
export function holdRootClass(name: string): void {
	const root = document.documentElement

	root.classList.add(name)

	onTestFinished(() => {
		root.classList.remove(name)
	})
}

/**
 * Writes `dir` on the root element for the current test. The root goes back to its `dir` before
 * the test when the test finishes.
 *
 * @param dir - The direction of the text.
 */
export function holdDir(dir: 'ltr' | 'rtl'): void {
	const root = document.documentElement

	const before = root.getAttribute('dir')

	root.dir = dir

	onTestFinished(() => {
		if (before === null) root.removeAttribute('dir')
		else root.setAttribute('dir', before)
	})
}

/**
 * Writes `step` on the root element for the current test. The root class goes back to its value
 * before the test when the test finishes.
 *
 * @remarks
 * A case can call it more than one time. The restores run in the reverse order of the calls, so
 * the last restore gives the class from before the first call.
 *
 * @param step - The density step to write.
 */
export function holdRoot(step: DensityStep): void {
	const root = document.documentElement

	const before = root.className

	writeRootDensity(root, step)

	onTestFinished(() => {
		root.className = before
	})
}
