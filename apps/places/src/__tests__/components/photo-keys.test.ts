import { describe, expect, it, vi } from 'vitest'
import { photo } from '../fixtures'

/** What the next upload of each file name does: fail with an error, or give its key. */
const plan = vi.hoisted(() => new Map<string, Error>())

/** The uploads that run at this moment, and the most that ran at one time. */
const running = vi.hoisted(() => ({ now: 0, most: 0, names: [] as string[] }))

vi.mock('../../api/places-api', async () => {
	class PhotoUploadError extends Error {
		readonly file: File

		constructor(file: File) {
			super(`${file.name} did not upload. Check the connection and try again.`)

			this.file = file
		}
	}

	return {
		PhotoUploadError,
		uploadPhoto: async (file: File, onProgress: (share: number) => void) => {
			running.names.push(file.name)

			running.now++

			running.most = Math.max(running.most, running.now)

			await new Promise((wake) => setTimeout(wake, 1))

			running.now--

			const failure = plan.get(file.name)

			plan.delete(file.name)

			if (failure === undefined) {
				onProgress(1)

				return `users/u1/${file.name}`
			}

			throw failure === PLAN_NO_ANSWER ? new PhotoUploadError(file) : failure
		},
	}
})

/** A marker in `plan` for an upload that gets no answer after every try. */
const PLAN_NO_ANSWER = vi.hoisted(() => new Error('no answer'))

const { photoKeys } = await import('../../components/place-form-drawer/photo-keys')

const { newPhoto } = await import('../../components/place-form-drawer/place-form')

const file = (name: string) => newPhoto(new File(['a'], name, { type: 'image/jpeg' }))

const ignore = () => {}

const reset = () => {
	plan.clear()

	Object.assign(running, { now: 0, most: 0, names: [] })
}

describe('photoKeys', () => {
	it('keeps each stored key and uploads each new file, in the order of the list', async () => {
		reset()

		const photos = [file('a.jpg'), photo('users/u1/stored.jpg'), file('b.jpg')]

		await expect(photoKeys(photos, ignore, new WeakMap())).resolves.toEqual([
			'users/u1/a.jpg',
			'users/u1/stored.jpg',
			'users/u1/b.jpg',
		])
	})

	it('reports the progress of each new file by its form key', async () => {
		reset()

		const added = file('a.jpg')

		const reports: [string, number][] = []

		await photoKeys(
			[photo('users/u1/stored.jpg'), added],
			(key, share) => reports.push([key, share]),
			new WeakMap(),
		)

		expect(reports).toEqual([[added.key, 1]])
	})

	it('uploads three files at a time', async () => {
		reset()

		const photos = ['1', '2', '3', '4', '5', '6', '7'].map((n) => file(`${n}.jpg`))

		await expect(photoKeys(photos, ignore, new WeakMap())).resolves.toHaveLength(7)

		expect(running.most).toBe(3)
	})

	it('finishes every upload when one fails, and a later save sends only the failed file', async () => {
		reset()

		const photos = [file('a.jpg'), file('b.jpg'), file('c.jpg')]

		const uploaded = new WeakMap<File, string>()

		plan.set('b.jpg', PLAN_NO_ANSWER)

		await expect(photoKeys(photos, ignore, uploaded)).rejects.toThrow(
			'b.jpg did not upload. Check the connection and try again.',
		)

		expect(running.names).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])

		running.names = []

		await expect(photoKeys(photos, ignore, uploaded)).resolves.toEqual([
			'users/u1/a.jpg',
			'users/u1/b.jpg',
			'users/u1/c.jpg',
		])

		expect(running.names).toEqual(['b.jpg'])
	})

	it('names every file that did not upload in one message', async () => {
		reset()

		plan.set('a.jpg', PLAN_NO_ANSWER)

		plan.set('c.jpg', PLAN_NO_ANSWER)

		await expect(
			photoKeys([file('a.jpg'), file('b.jpg'), file('c.jpg')], ignore, new WeakMap()),
		).rejects.toThrow('a.jpg, c.jpg did not upload. Check the connection and try again.')
	})

	it('gives the words of a refusal before the files that got no answer', async () => {
		reset()

		plan.set('a.jpg', PLAN_NO_ANSWER)

		plan.set('b.jpg', new Error('Sign in again.'))

		await expect(photoKeys([file('a.jpg'), file('b.jpg')], ignore, new WeakMap())).rejects.toThrow(
			'Sign in again.',
		)
	})
})
