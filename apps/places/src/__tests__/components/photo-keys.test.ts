import { describe, expect, it, vi } from 'vitest'
import { photo } from '../fixtures'

vi.mock('../../api/places-api', () => ({
	uploadPhoto: async (file: File, onProgress: (share: number) => void) => {
		onProgress(1)

		return `users/u1/${file.name}`
	},
}))

const { photoKeys } = await import('../../components/place-form-drawer/photo-keys')

const { newPhoto } = await import('../../components/place-form-drawer/place-form')

describe('photoKeys', () => {
	it('keeps each stored key and uploads each new file, in the order of the list', async () => {
		const photos = [
			newPhoto(new File(['a'], 'a.jpg', { type: 'image/jpeg' })),
			photo('users/u1/stored.jpg'),
			newPhoto(new File(['b'], 'b.png', { type: 'image/png' })),
		]

		await expect(photoKeys(photos, () => {})).resolves.toEqual([
			'users/u1/a.jpg',
			'users/u1/stored.jpg',
			'users/u1/b.png',
		])
	})

	it('reports the progress of each new file by its form key', async () => {
		const added = newPhoto(new File(['a'], 'a.jpg', { type: 'image/jpeg' }))

		const reports: [string, number][] = []

		await photoKeys([photo('users/u1/stored.jpg'), added], (key, share) =>
			reports.push([key, share]),
		)

		expect(reports).toEqual([[added.key, 1]])
	})
})
