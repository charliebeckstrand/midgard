import { onTestFinished, vi } from 'vitest'

/**
 * Run `run` and return the last `tagName` element it appended to
 * `document.body`, typed from the tag.
 *
 * @remarks
 * The print paths reclaim their iframe from an `afterprint` or window-`focus`
 * handler, and jsdom fires neither, so every call leaves the node attached.
 * Teardown dispatches the window `focus` a real browser fires when the print
 * dialog closes, which drives the module's own cleanup. Teardown runs through
 * `onTestFinished`, so it survives a throwing assertion above it — and it is
 * registered even when `run` throws, because a node appended before the throw
 * is exactly what this helper exists to reclaim.
 *
 * Not re-exported from `helpers/index.ts`: two suites use it, and that barrel
 * is on the path ~210 files evaluate.
 *
 * @param run - Call that appends the node.
 * @param tagName - Tag to match, so a render in the same `run` does not shadow
 * the node under test.
 */
export function captureAppended<K extends keyof HTMLElementTagNameMap>(
	run: () => void,
	tagName: K,
): HTMLElementTagNameMap[K] {
	const appendChild = vi.spyOn(document.body, 'appendChild')

	const captured = () => {
		const node = appendChild.mock.calls.findLast(
			(call) => (call[0] as Element).localName === tagName,
		)?.[0] as HTMLElementTagNameMap[K] | undefined

		appendChild.mockRestore()

		if (node) {
			onTestFinished(() => {
				window.dispatchEvent(new Event('focus'))

				node.remove()
			})
		}

		return node
	}

	let node: HTMLElementTagNameMap[K] | undefined

	try {
		run()
	} finally {
		node = captured()
	}

	if (!node) throw new Error(`captureAppended: no <${tagName}> appended to document.body`)

	return node
}
