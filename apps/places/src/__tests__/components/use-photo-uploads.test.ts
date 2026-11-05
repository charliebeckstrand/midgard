// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The upload of each file name that runs, with what reports its progress and what ends it. */
const uploads = vi.hoisted(
	() => new Map<string, { onProgress: (share: number) => void; end: () => void }>(),
)

vi.mock('../../api/places-api', () => ({
	PhotoUploadError: class extends Error {},
	uploadPhoto: (file: File, onProgress: (share: number) => void) =>
		new Promise<string>((resolve) => {
			uploads.set(file.name, { onProgress, end: () => resolve(`users/u1/${file.name}`) })
		}),
}))

const { usePhotoUploads } = await import('../../components/place-form-drawer/use-photo-uploads')

const { newPhoto } = await import('../../components/place-form-drawer/place-form')

const file = (name: string) => newPhoto(new File(['a'], name, { type: 'image/jpeg' }))

afterEach(() => {
	cleanup()

	uploads.clear()
})

describe('usePhotoUploads', () => {
	// The reader saves, the save fails on another check, and the reader saves
	// again. The uploads of the first save end after the second save started.
	it('keeps the progress of a later save when the uploads of an earlier save end', async () => {
		const { result } = renderHook(() => usePhotoUploads())

		const first = file('a.jpg')

		const second = file('b.jpg')

		let earlier: Promise<string[]> = Promise.resolve([])

		act(() => {
			earlier = result.current.upload([first])
		})

		act(() => {
			void result.current.upload([second])
		})

		await act(async () => {
			uploads.get('a.jpg')?.end()

			await earlier
		})

		expect(result.current.progress.get(second.key)).toBe(0)

		act(() => uploads.get('b.jpg')?.onProgress(0.5))

		expect(result.current.progress.get(second.key)).toBe(0.5)
	})
})
