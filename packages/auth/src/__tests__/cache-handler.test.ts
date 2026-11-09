import { describe, expect, it } from 'vitest'
import { createCacheHandler } from '../cache-handler'

/** An entry of `text`, made `age` seconds ago, as Next gives it to `set`. */
function entry(
	text: string,
	{ age = 0, revalidate = 60, expire = 3600, tags = [] as string[] } = {},
) {
	return {
		value: new Response(text).body as ReadableStream<Uint8Array>,
		tags,
		stale: 300,
		timestamp: performance.timeOrigin + performance.now() - age * 1000,
		expire,
		revalidate,
	}
}

/** The text of the value of an entry, or `undefined` for a miss. */
async function read(handler: ReturnType<typeof createCacheHandler>, key: string) {
	const hit = await handler.get(key, [])

	return hit === undefined ? undefined : new Response(hit.value).text()
}

describe('createCacheHandler', () => {
	it('serves an entry past its revalidate time, so Next renders a fresh one in the background', async () => {
		const handler = createCacheHandler()

		await handler.set('race', Promise.resolve(entry('count', { age: 120 })))

		await expect(read(handler, 'race')).resolves.toBe('count')

		// Each hit takes its own stream.
		await expect(read(handler, 'race')).resolves.toBe('count')

		await expect(handler.get('race', [])).resolves.toMatchObject({ revalidate: 60, expire: 3600 })
	})

	it('waits for a set that is still in flight', async () => {
		const handler = createCacheHandler()

		let resolve = (_: ReturnType<typeof entry>) => {}

		const set = handler.set('race', new Promise((done) => (resolve = done)))

		const hit = read(handler, 'race')

		resolve(entry('count'))

		await set

		await expect(hit).resolves.toBe('count')
	})

	it('does not store a dynamic entry, whose expire is 0', async () => {
		const handler = createCacheHandler()

		await handler.set('race', Promise.resolve(entry('count', { expire: 0 })))

		await expect(read(handler, 'race')).resolves.toBeUndefined()
	})

	it('evicts the least recent entry when the store is full', async () => {
		// Room for two entries of 5 bytes with 1-byte keys.
		const handler = createCacheHandler(12)

		await handler.set('a', Promise.resolve(entry('aaaaa')))

		await handler.set('b', Promise.resolve(entry('bbbbb')))

		// A hit makes `a` the most recent.
		await read(handler, 'a')

		await handler.set('c', Promise.resolve(entry('ccccc')))

		await expect(read(handler, 'a')).resolves.toBe('aaaaa')

		await expect(read(handler, 'b')).resolves.toBeUndefined()

		await expect(read(handler, 'c')).resolves.toBe('ccccc')
	})

	it('drops an entry whose tag expired, and asks a fresh entry for a stale tag', async () => {
		const handler = createCacheHandler()

		await handler.set('a', Promise.resolve(entry('a', { age: 1, tags: ['races'] })))

		await handler.set('b', Promise.resolve(entry('b', { age: 1, tags: ['calls'] })))

		await handler.updateTags(['races'])

		await handler.updateTags(['calls'], { expire: 3600 })

		await expect(read(handler, 'a')).resolves.toBeUndefined()

		await expect(handler.get('b', [])).resolves.toMatchObject({ revalidate: -1 })

		await expect(handler.getExpiration(['races'])).resolves.toBeGreaterThan(0)

		await expect(handler.getExpiration(['other'])).resolves.toBe(0)
	})
})
