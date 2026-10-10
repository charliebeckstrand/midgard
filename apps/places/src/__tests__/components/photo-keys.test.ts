import { describe, expect, it, vi } from 'vitest'
import { photo } from '../fixtures'

vi.mock('../../api/places-api', () => ({
	uploadPhoto: async (file: File) => `users/u1/${file.name}`,
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

		await expect(photoKeys(photos)).resolves.toEqual([
			'users/u1/a.jpg',
			'users/u1/stored.jpg',
			'users/u1/b.png',
		])
	})
})
