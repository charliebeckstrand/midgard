import { afterAll } from 'vitest'
import { page } from 'vitest/browser'

/**
 * Returns the page to the size it started at when a file finishes with it.
 *
 * `page.viewport()` resizes the shared page, and seventeen files in this suite
 * call it in a `beforeAll` without putting it back. A file that sets none
 * therefore runs at whatever the file before it left, which is invisible in the
 * file and changes with the order.
 *
 * The spread is wide enough to matter. The suite's own default is 414x896, a
 * phone, while the sizes those files set run to 1280x800 — so a case written
 * and verified against a narrow column can run against a wide one, or the other
 * way about, purely by position in the run.
 *
 * The size is read once, as this module loads. Both instances load it before
 * any file runs and `isolate: false` keeps one page per instance, so what it
 * reads is the configured default rather than another file's leftovers.
 */

const width = window.innerWidth

const height = window.innerHeight

/**
 * Registers the restore. Call it at the top level of the setup file, so it
 * binds once per file rather than once per test: a file that sets its viewport
 * in `beforeAll` must keep it for every case it runs.
 */
export function restoreViewportAfterFile(): void {
	afterAll(async () => {
		if (window.innerWidth === width && window.innerHeight === height) return

		await page.viewport(width, height)
	})
}
