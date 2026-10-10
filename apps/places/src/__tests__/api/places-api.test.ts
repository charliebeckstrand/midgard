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

const { uploadPhoto } = await import('../../api/places-api')

/** What a fake request does once it sends: answer with a status, or fail with no response. */
type Outcome = { status: number } | 'error'

/** Each request that a test sends, with its address, headers, and body. */
const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = []

let outcome: Outcome = { status: 200 }

/**
 * A stand-in for `XMLHttpRequest`, which Node does not have. A send reports
 * half of the body and then all of it, and then gives the outcome of the test.
 */
class FakeRequest {
	status = 0

	upload = new EventTarget()

	readonly #events = new EventTarget()

	readonly #request = {
		method: '',
		url: '',
		headers: {} as Record<string, string>,
		body: null as unknown,
	}

	open(method: string, url: string) {
		Object.assign(this.#request, { method, url })
	}

	setRequestHeader(name: string, value: string) {
		this.#request.headers[name] = value
	}

	addEventListener(type: string, listener: EventListener) {
		this.#events.addEventListener(type, listener)
	}

	send(body: unknown) {
		sent.push({ ...this.#request, body })

		const total = body instanceof File ? body.size : 0

		queueMicrotask(() => {
			for (const loaded of [total / 2, total]) {
				this.upload.dispatchEvent(
					Object.assign(new Event('progress'), { lengthComputable: true, loaded, total }),
				)
			}

			if (outcome === 'error') {
				this.#events.dispatchEvent(new Event('error'))

				return
			}

			this.status = outcome.status

			this.#events.dispatchEvent(new Event('load'))
		})
	}
}

beforeEach(() => {
	starts.length = 0

	sent.length = 0

	outcome = { status: 200 }

	vi.stubGlobal('XMLHttpRequest', FakeRequest)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('uploadPhoto', () => {
	it('puts each file at the address that Mimir signs, and gives its key', async () => {
		const files = [
			new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
			new File(['bb'], 'b.png', { type: 'image/png' }),
		]

		await expect(Promise.all(files.map((file) => uploadPhoto(file, () => {})))).resolves.toEqual([
			'users/u1/1.jpeg',
			'users/u1/2.png',
		])

		expect(starts).toEqual([
			{ path: '/api/photos/uploads', body: { contentType: 'image/jpeg', size: 1 } },
			{ path: '/api/photos/uploads', body: { contentType: 'image/png', size: 2 } },
		])

		expect(sent[0]).toEqual({
			method: 'PUT',
			url: 'https://bucket.example.com/users/u1/1.jpeg?signed',
			headers: { 'Content-Type': 'image/jpeg' },
			body: files[0],
		})
	})

	it('reports the share of the file that has gone', async () => {
		const shares: number[] = []

		await uploadPhoto(new File(['abcd'], 'a.jpg', { type: 'image/jpeg' }), (share) =>
			shares.push(share),
		)

		expect(shares).toEqual([0.5, 1])
	})

	it('refuses a file of another type before it asks Mimir', async () => {
		await expect(
			uploadPhoto(new File(['a'], 'a.gif', { type: 'image/gif' }), () => {}),
		).rejects.toThrow('a.gif is not a JPEG, PNG, or WebP image.')

		expect(starts).toEqual([])
	})

	it('fails with the name of a file that the store refuses', async () => {
		outcome = { status: 403 }

		await expect(
			uploadPhoto(new File(['a'], 'a.jpg', { type: 'image/jpeg' }), () => {}),
		).rejects.toThrow('a.jpg did not upload. Try again.')
	})

	it('fails with the name of a file that gets no response', async () => {
		outcome = 'error'

		await expect(
			uploadPhoto(new File(['a'], 'a.jpg', { type: 'image/jpeg' }), () => {}),
		).rejects.toThrow('a.jpg did not reach the photo store. Try again.')
	})
})
