import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The upload starts that Mimir is asked for, in order. */
const starts = vi.hoisted(() => [] as unknown[])

/** The statuses that Mimir answers the next upload starts with, in order. A start past the list gets a `200`. */
const signs = vi.hoisted(() => [] as (number | 'error')[])

vi.mock('shared/mimir', () => ({
	createMimirClient: () => ({
		POST: async (path: string, { body }: { body: { contentType: string } }) => {
			starts.push({ path, body })

			const status = signs.shift() ?? 200

			if (status === 'error') throw new TypeError('Failed to fetch')

			if (status !== 200) {
				return {
					error: { message: `Mimir said ${status}` },
					response: { ok: false, status, url: path },
				}
			}

			const key = `users/u1/${starts.length}.${body.contentType.split('/')[1]}`

			return {
				data: { key, uploadUrl: `https://bucket.example.com/${key}?signed` },
				response: { ok: true, status },
			}
		},
	}),
}))

/**
 * What a fake request does once it sends: answer with a status, fail with no
 * answer, or send half of the body and then nothing more.
 */
type Outcome = number | 'error' | 'stall'

/** Each request that a test sends, with its address, headers, and body. */
const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = []

/** The outcomes of the next sends, in order. A send past the list gets a `200`. */
const outcomes: Outcome[] = []

/**
 * A stand-in for `XMLHttpRequest`, which Node does not have. A send reports
 * half of the body and then all of it, and then gives its outcome.
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

	abort() {
		this.#events.dispatchEvent(new Event('abort'))
	}

	#progress(loaded: number, total: number) {
		this.upload.dispatchEvent(
			Object.assign(new Event('progress'), { lengthComputable: true, loaded, total }),
		)
	}

	send(body: unknown) {
		sent.push({ ...this.#request, body })

		const total = body instanceof File ? body.size : 0

		const outcome = outcomes.shift() ?? 200

		queueMicrotask(() => {
			this.#progress(total / 2, total)

			if (outcome === 'stall') return

			this.#progress(total, total)

			if (outcome === 'error') {
				this.#events.dispatchEvent(new Event('error'))

				return
			}

			this.status = outcome

			this.#events.dispatchEvent(new Event('load'))
		})
	}
}

const { uploadPhoto, PhotoUploadError } = await import('../../api/places-api')

const jpeg = (name = 'a.jpg') => new File(['abcd'], name, { type: 'image/jpeg' })

const ignore = () => {}

beforeEach(() => {
	starts.length = 0

	signs.length = 0

	sent.length = 0

	outcomes.length = 0

	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

	vi.stubGlobal('XMLHttpRequest', FakeRequest)
})

afterEach(() => {
	vi.useRealTimers()
})

describe('uploadPhoto', () => {
	it('puts each file at the address that Mimir signs, and gives its key', async () => {
		const files = [jpeg(), new File(['bb'], 'b.png', { type: 'image/png' })]

		await expect(Promise.all(files.map((file) => uploadPhoto(file, ignore)))).resolves.toEqual([
			'users/u1/1.jpeg',
			'users/u1/2.png',
		])

		expect(starts).toEqual([
			{ path: '/api/photos/uploads', body: { contentType: 'image/jpeg', size: 4 } },
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

		await uploadPhoto(jpeg(), (share) => shares.push(share))

		expect(shares).toEqual([0, 0.5, 1])
	})

	it('refuses a file of another type before it asks Mimir', async () => {
		await expect(
			uploadPhoto(new File(['a'], 'a.gif', { type: 'image/gif' }), ignore),
		).rejects.toThrow('a.gif is not a JPEG, PNG, or WebP image.')

		expect(starts).toEqual([])
	})

	it('tries again at a new address after a send that gets no answer or a refusal', async () => {
		outcomes.push('error', 403)

		const shares: number[] = []

		const upload = uploadPhoto(jpeg(), (share) => shares.push(share))

		await vi.runAllTimersAsync()

		await expect(upload).resolves.toBe('users/u1/3.jpeg')

		expect(sent.map((request) => request.url)).toEqual([
			'https://bucket.example.com/users/u1/1.jpeg?signed',
			'https://bucket.example.com/users/u1/2.jpeg?signed',
			'https://bucket.example.com/users/u1/3.jpeg?signed',
		])

		// Each try starts the gauge again from zero.
		expect(shares).toEqual([0, 0.5, 1, 0, 0.5, 1, 0, 0.5, 1])
	})

	it('stops a send that makes no progress, and tries again', async () => {
		outcomes.push('stall')

		const upload = uploadPhoto(jpeg(), ignore)

		await vi.advanceTimersByTimeAsync(29_999)

		expect(sent).toHaveLength(1)

		await vi.runAllTimersAsync()

		await expect(upload).resolves.toBe('users/u1/2.jpeg')

		expect(sent).toHaveLength(2)
	})

	it('tries again when the gateway is down or gives no answer', async () => {
		signs.push(502, 'error')

		const upload = uploadPhoto(jpeg(), ignore)

		await vi.runAllTimersAsync()

		await expect(upload).resolves.toBe('users/u1/3.jpeg')
	})

	it('fails at once with the words of Mimir when it refuses the file', async () => {
		signs.push(400)

		await expect(uploadPhoto(jpeg(), ignore)).rejects.toThrow('Mimir said 400')

		expect(starts).toHaveLength(1)
	})

	it('fails with the name of the file after the last try', async () => {
		outcomes.push('error', 'error', 500)

		const upload = uploadPhoto(jpeg(), ignore)

		const failed = expect(upload).rejects.toThrow(new PhotoUploadError(jpeg()).message)

		await vi.runAllTimersAsync()

		await failed

		await expect(upload).rejects.toBeInstanceOf(PhotoUploadError)

		expect(sent).toHaveLength(3)
	})
})
