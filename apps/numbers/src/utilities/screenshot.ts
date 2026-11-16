import { downloadBlob, rasterizeElement } from 'ui/core'
import { FRAME_ID } from './frame'

/** What a screenshot did: the share sheet took it, the browser saved it, or the reader closed the share sheet. */
export type ScreenshotOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Draws the box of the page ({@link FRAME_ID}) to a PNG, as the screen shows it
 * now, and gives it to the share sheet of the device. A browser that cannot
 * share a file saves it. The name of the file holds the seed of the address.
 *
 * The share sheet opens only within a few seconds of a press (the transient
 * activation of the browser), so call it in the event handler of the press.
 * The raster takes time, and on a slow device the activation can expire before
 * the share. The browser then refuses the share (`NotAllowedError`), and the
 * function saves the image.
 *
 * @returns What the screenshot did. The promise rejects when the page has no
 * box, when the canvas gives no image, or when the share fails.
 */
export function shareScreenshot(): Promise<ScreenshotOutcome> {
	const frame = document.getElementById(FRAME_ID)

	if (!frame) return Promise.reject(new Error(`No element has the id ${FRAME_ID}.`))

	const name = `numbers-${window.location.pathname.slice(1)}.png`

	return rasterizeElement(frame, { opaque: true }).then((blob) => {
		if (!blob) throw new Error('The page gave no image.')

		const file = new File([blob], name, { type: blob.type })

		if (!navigator.canShare?.({ files: [file] })) {
			downloadBlob(blob, name)

			return 'downloaded'
		}

		return navigator.share({ files: [file] }).then(
			(): ScreenshotOutcome => 'shared',
			(error: unknown) => {
				// The reader closed the share sheet, which is not a failure.
				if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'

				// The activation of the press expired during the raster.
				if (error instanceof DOMException && error.name === 'NotAllowedError') {
					downloadBlob(blob, name)

					return 'downloaded'
				}

				throw error
			},
		)
	})
}
