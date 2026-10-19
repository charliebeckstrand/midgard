import { warnOnce } from 'motion'
import { vi } from 'vitest'

/**
 * The hint that Motion writes to `console.warn` in development, one time for
 * each page, when the first element on the page reduces its motion.
 */
const HINT =
	'You have Reduced Motion enabled on your device. Animations may not appear as expected.'

/**
 * Gives Motion's reduced-motion hint before the files of a project with real
 * Motion run.
 *
 * Motion gives the hint to the first element on the page that reduces its
 * motion, and never again. The shuffle decides which case renders that
 * element first, so the hint would land in a different case on each run, and
 * the console guard (`helpers/console-guard.ts`) would fail that case. Given
 * here, each case has the state of a page that gave the hint already.
 */
export function giveReducedMotionHint(): void {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

	try {
		warnOnce(false, HINT, 'reduced-motion-disabled')
	} finally {
		warn.mockRestore()
	}
}
