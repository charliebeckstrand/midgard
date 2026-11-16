// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAME_ID } from '../utilities/frame'
import { shareScreenshot } from '../utilities/screenshot'

const { downloadBlob, rasterizeElement } = vi.hoisted(() => ({
	downloadBlob: vi.fn(),
	rasterizeElement: vi.fn(),
}))

// jsdom draws no canvas, so the raster gives a fixed image.
vi.mock('ui/core', () => ({ downloadBlob, rasterizeElement }))

const IMAGE = new Blob(['png'], { type: 'image/png' })

/** Gives the navigator a share sheet, and returns the stub of `share`. */
function stubShare(share: () => Promise<void>) {
	const stub = vi.fn(share)

	vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: stub })

	return stub
}

beforeEach(() => {
	const frame = document.createElement('div')

	frame.id = FRAME_ID

	document.body.append(frame)

	window.history.replaceState(null, '', '/k3x9q2')

	rasterizeElement.mockResolvedValue(IMAGE)
})

afterEach(() => {
	document.body.replaceChildren()

	vi.unstubAllGlobals()

	vi.clearAllMocks()
})

describe('shareScreenshot', () => {
	it('draws the frame as an opaque image', async () => {
		stubShare(() => Promise.resolve())

		await shareScreenshot()

		expect(rasterizeElement).toHaveBeenCalledWith(document.getElementById(FRAME_ID), {
			opaque: true,
		})
	})

	it('gives the image to the share sheet, named for the seed', async () => {
		const share = stubShare(() => Promise.resolve())

		await expect(shareScreenshot()).resolves.toBe('shared')

		const [{ files }] = share.mock.calls[0] as unknown as [{ files: File[] }]

		expect(files[0]?.name).toBe('numbers-k3x9q2.png')

		expect(downloadBlob).not.toHaveBeenCalled()
	})

	it('saves the image where the browser cannot share a file', async () => {
		vi.stubGlobal('navigator', { ...navigator, canShare: undefined })

		await expect(shareScreenshot()).resolves.toBe('downloaded')

		expect(downloadBlob).toHaveBeenCalledWith(IMAGE, 'numbers-k3x9q2.png')
	})

	it('is cancelled when the reader closes the share sheet', async () => {
		stubShare(() => Promise.reject(new DOMException('Closed', 'AbortError')))

		await expect(shareScreenshot()).resolves.toBe('cancelled')
	})

	it('rejects when the share fails', async () => {
		stubShare(() => Promise.reject(new DOMException('Refused', 'NotAllowedError')))

		await expect(shareScreenshot()).rejects.toThrow('Refused')
	})

	it('rejects when the canvas gives no image', async () => {
		rasterizeElement.mockResolvedValue(null)

		await expect(shareScreenshot()).rejects.toThrow('no image')
	})

	it('rejects when the page has no frame', async () => {
		document.body.replaceChildren()

		await expect(shareScreenshot()).rejects.toThrow(FRAME_ID)
	})
})
