import { type MockInstance, vi } from 'vitest'

/** The spies over one browser download, and the blobs the code handed to it. */
export type CapturedDownload = {
	/** `URL.createObjectURL`, which answers `'blob:mock'`. Each call is one blob. */
	createObjectURL: MockInstance<typeof URL.createObjectURL>
	/** `URL.revokeObjectURL`, as a no-op. */
	revokeObjectURL: MockInstance<typeof URL.revokeObjectURL>
	/** The anchor click that starts the download, as a no-op, so jsdom goes nowhere. */
	click: MockInstance<HTMLAnchorElement['click']>
	/**
	 * The blob that call `index` of `createObjectURL` carried.
	 *
	 * @throws If that call did not happen, or carried no blob.
	 */
	blob: (index?: number) => Blob
	/**
	 * The name of the file that click `index` of the anchor downloads.
	 *
	 * @throws If that click did not happen.
	 */
	filename: (index?: number) => string
}

/**
 * Captures the downloads the code starts: the object URL it creates, the URL it
 * revokes, and the anchor it clicks.
 *
 * @remarks
 * Every spy goes through `vi.spyOn`, so `restoreMocks` puts the originals back
 * before the next test. A raw assignment such as `URL.createObjectURL = vi.fn()`
 * has no such restore. The `unit` project shares one window across a worker's
 * files, so the mock stays for every file after it. A later `vi.spyOn` of that
 * member returns the leaked mock itself, so nothing restores it either.
 *
 * {@link CapturedDownload.blob} and {@link CapturedDownload.filename} throw at a
 * missing call and name the count. A read through `mock.calls[0]?.[0] as Blob`
 * puts that miss at the next member access, as a `TypeError` on `undefined`.
 *
 * Not re-exported from `helpers/index.ts`: few suites use it, and most test
 * files load that barrel.
 *
 * @returns The spies, and the readers for the blobs and the file names.
 *
 * @example
 * ```typescript
 * const download = captureDownload()
 *
 * fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))
 *
 * expect(await download.blob().text()).toContain('Name,Role')
 * ```
 */
export function captureDownload(): CapturedDownload {
	const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

	const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

	return {
		createObjectURL,
		revokeObjectURL,
		click,
		blob: (index = 0) => {
			const [object] = createObjectURL.mock.calls[index] ?? []

			if (!(object instanceof Blob)) {
				throw new Error(
					`captureDownload: createObjectURL call ${index} carried no blob; it ran ${createObjectURL.mock.calls.length} times`,
				)
			}

			return object
		},
		filename: (index = 0) => {
			const anchor = click.mock.contexts[index]

			if (!(anchor instanceof HTMLAnchorElement)) {
				throw new Error(
					`captureDownload: click ${index} did not happen; it ran ${click.mock.calls.length} times`,
				)
			}

			return anchor.download
		},
	}
}
