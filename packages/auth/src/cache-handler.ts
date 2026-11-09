import type { CacheEntry, CacheHandler } from 'next/cache'

/*
 * The `'use cache'` handler of each app: an in-memory LRU store, as the
 * built-in handler of Next, with one change of policy. The built-in handler
 * drops an entry at its `revalidate` time, so the next read waits for the
 * source. This handler keeps an entry until its `expire` time. Next serves an
 * entry past `revalidate` and renders a fresh one in the background, so a
 * read waits for the source only past `expire` (see the `cacheHandlers` page
 * of the Next docs). The app config names this file (`appConfig`).
 */

/** The most bytes that the store holds, as the built-in handler: 50 MB. */
const MAX_BYTES = 50 * 1024 * 1024

/** A stored entry: the fields of the entry, with its value as bytes, not as a stream. */
type Stored = Omit<CacheEntry, 'value'> & { value: Uint8Array }

/** The times at which a tag went stale and expired, in milliseconds. */
type TagTimes = { stale?: number; expired?: number }

/** The time now, in milliseconds, on the clock of the timestamps of Next. */
function now(): number {
	return performance.timeOrigin + performance.now()
}

/** A new stream over stored bytes. A stream reads once, so each hit takes its own. */
function toStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(bytes)

			controller.close()
		},
	})
}

/**
 * Makes a `'use cache'` handler that holds at most `maxBytes` of values. A
 * `Map` keeps its keys in the order of insertion, so a hit moves its key to
 * the end, and an overflow evicts from the start: the least recent first.
 *
 * @param maxBytes - The most bytes of the values and the keys that the store holds.
 */
export function createCacheHandler(maxBytes: number = MAX_BYTES): CacheHandler {
	const store = new Map<string, Stored>()

	const pending = new Map<string, Promise<void>>()

	const tags = new Map<string, TagTimes>()

	let bytes = 0

	const size = (key: string, stored: Stored) => stored.value.byteLength + key.length

	const remove = (key: string) => {
		const stored = store.get(key)

		if (stored === undefined) return

		bytes -= size(key, stored)

		store.delete(key)
	}

	// A tag that expired after the entry was made, and is now past its expiry.
	const isExpired = (entry: Stored) =>
		entry.tags.some((tag) => {
			const expired = tags.get(tag)?.expired

			return expired !== undefined && expired > entry.timestamp && expired <= now()
		})

	// A tag that went stale after the entry was made.
	const isStale = (entry: Stored) =>
		entry.tags.some((tag) => (tags.get(tag)?.stale ?? 0) > entry.timestamp)

	return {
		async get(cacheKey) {
			await pending.get(cacheKey)

			const stored = store.get(cacheKey)

			// A negative `expire` marks an evicted entry (see the built-in handler).
			if (stored === undefined || stored.expire < 0 || isExpired(stored)) return undefined

			// No age check: Next compares `timestamp` with `expire` on each read.
			store.delete(cacheKey)

			store.set(cacheKey, stored)

			return {
				...stored,
				// A stale tag asks for a fresh entry in the background.
				revalidate: isStale(stored) ? -1 : stored.revalidate,
				value: toStream(stored.value),
			}
		},

		async set(cacheKey, pendingEntry) {
			let done = () => {}

			pending.set(
				cacheKey,
				new Promise((resolve) => {
					done = resolve
				}),
			)

			try {
				const entry = await pendingEntry

				// An `expire` of 0 is dynamic: Next renders it again on each read.
				if (entry.expire === 0) return

				const value = new Uint8Array(await new Response(entry.value).arrayBuffer())

				const stored: Stored = { ...entry, value }

				remove(cacheKey)

				if (size(cacheKey, stored) > maxBytes) return

				store.set(cacheKey, stored)

				bytes += size(cacheKey, stored)

				for (const key of store.keys()) {
					if (bytes <= maxBytes) break

					remove(key)
				}
			} catch {
				// A value that fails to render is not stored, so the next read renders it again.
			} finally {
				done()

				pending.delete(cacheKey)
			}
		},

		async refreshTags() {
			// The store is in memory, so no other process changes a tag.
		},

		async getExpiration(names) {
			return Math.max(0, ...names.map((name) => tags.get(name)?.expired ?? 0))
		},

		async updateTags(names, durations) {
			const time = now()

			for (const name of names) {
				const times = tags.get(name) ?? {}

				tags.set(
					name,
					durations === undefined
						? { ...times, expired: time }
						: {
								...times,
								stale: time,
								...(durations.expire === undefined
									? {}
									: { expired: time + durations.expire * 1000 }),
							},
				)
			}
		},
	}
}

// Next loads the handler as the default export of this file.
export default createCacheHandler()
