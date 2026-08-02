import { onTestFinished, vi } from 'vitest'

/**
 * Run `run` and return the last `tagName` element it appended to
 * `document.body`.
 *
 * @remarks
 * The print paths reclaim their iframe from an `afterprint` or window-`focus`
 * handler, and jsdom fires neither, so every call leaves the node attached.
 * Teardown dispatches the window `focus` a real browser fires when the print
 * dialog closes. That drives the module's own cleanup, which removes the node
 * and releases the `{ once: true }` listener that closes over the iframe and
 * its print document. Both steps are no-ops for a producer that already
 * cleaned up, such as the download anchor.
 *
 * Teardown runs through `onTestFinished`, so it survives a throwing assertion
 * above it. A node left behind outlives its test, and under the unit project's
 * shared jsdom window it outlives its file.
 *
 * @param run - Call that appends the node.
 * @param tagName - Upper-case tag to match, so a render in the same `run` does
 * not shadow the node under test.
 *
 * @remarks
 * Kept out of `helpers/index.ts` for the reason recorded there: ~210 files
 * import that barrel, and each entry it gains they all evaluate.
 */
export function captureAppended<E extends HTMLElement>(run: () => void, tagName: string): E {
	const appendChild = vi.spyOn(document.body, 'appendChild')

	run()

	const node = appendChild.mock.calls.findLast(
		(call) => (call[0] as HTMLElement).tagName === tagName,
	)?.[0] as E

	appendChild.mockRestore()

	onTestFinished(() => {
		window.dispatchEvent(new Event('focus'))

		node?.remove()
	})

	return node
}
