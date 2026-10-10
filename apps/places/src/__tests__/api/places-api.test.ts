import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The upload starts that Mimir is asked for, in order. */
const starts = vi.hoisted(() => [] as unknown[])

vi.mock('shared/mimir', () => ({
	createMimirClient: () => ({
		POST: async (path: string, { body }: { body: { contentType: string } }) => {
			starts.push({ path, body })

			const key = `users/u1/${starts.length}.${body.contentType.split('/')[1]}`

			return {
				data: { key, uploadUrl: `https://bucket.example.com/${key}?signed` },
				response: { ok: true },
			}
		},
	}),
}))

const { uploadPhotos } = await import('../../api/places-api')

const put = vi.fn<typeof fetch>()

beforeEach(() => {
	starts.length = 0

	put.mockReset()

	put.mockResolvedValue(new Response(null, { status: 200 }))

	vi.stubGlobal('fetch', put)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('uploadPhotos', () => {
	it('puts each file at the address that Mimir signs, and gives the keys in order', async () => {
		const files = [
			new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
			new File(['bb'], 'b.png', { type: 'image/png' }),
		]

		await expect(uploadPhotos(files)).resolves.toEqual(['users/u1/1.jpeg', 'users/u1/2.png'])

		expect(starts).toEqual([
			{ path: '/api/photos/uploads', body: { contentType: 'image/jpeg', size: 1 } },
			{ path: '/api/photos/uploads', body: { contentType: 'image/png', size: 2 } },
		])

		expect(put).toHaveBeenCalledWith('https://bucket.example.com/users/u1/1.jpeg?signed', {
			method: 'PUT',
			body: files[0],
			headers: { 'Content-Type': 'image/jpeg' },
		})
	})

	it('refuses a file of another type before it asks Mimir', async () => {
		await expect(uploadPhotos([new File(['a'], 'a.gif', { type: 'image/gif' })])).rejects.toThrow(
			'a.gif is not a JPEG, PNG, or WebP image.',
		)

		expect(starts).toEqual([])
	})

	it('fails with the name of a file that the store refuses', async () => {
		put.mockResolvedValue(new Response(null, { status: 403 }))

		await expect(uploadPhotos([new File(['a'], 'a.jpg', { type: 'image/jpeg' })])).rejects.toThrow(
			'a.jpg did not upload. Try again.',
		)
	})
})
