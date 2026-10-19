import { afterEach, describe, expect, vi } from 'vitest'
import {
	CAPACITY,
	CAPTURE_CAPACITY,
	EventStore,
	type NewEntry,
	REPORTS,
	TRAIL,
} from '../../modules/events/engine/events-store'
import type { EventStorage } from '../../modules/events/engine/types'
import { createStorage } from '../helpers/event-storage'
import { it } from '../helpers/fake-clock'

/** A storage whose each access throws, as with site data off. */
const blocked: EventStorage = {
	getItem: () => {
		throw new Error('blocked')
	},
	setItem: () => {
		throw new Error('blocked')
	},
	removeItem: () => {
		throw new Error('blocked')
	},
}

function entry(time: number, kind = 'input'): NewEntry {
	return { time, kind, text: `${kind} at ${time}`, y: 0 }
}

/** An error with a fixed stack, so the first frame is known. */
function errorWith(message: string, frame = 'at rows (grid.js:1:2)'): Error {
	const error = new Error(message)

	error.stack = `Error: ${message}\n    ${frame}`

	return error
}

/** The texts of the events of a store, oldest first. */
function texts(store: EventStore): string[] {
	return store.entries.map(({ text }) => text)
}

afterEach(() => {})

/** Sets the time of the page, which a capture gives to its start and its end. */
function now(time: number) {
	vi.spyOn(performance, 'now').mockReturnValue(time)
}

describe('EventStore', () => {
	it('keeps no events through a reload while "Preserve" is off', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.add(entry(10))

		store.save()

		expect(new EventStore(storage).entries).toEqual([])
	})

	it('keeps the events through a reload while "Preserve" is on, and gives the next id after them', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		store.add(entry(10))

		store.save()

		const reloaded = new EventStore(storage)

		expect(reloaded.preserve).toBe(true)

		expect(texts(reloaded)).toEqual(['input at 10'])

		reloaded.add(entry(20))

		expect(reloaded.entries.map(({ id }) => id)).toEqual([1, 2])
	})

	it('saves the events 500 ms after the last event', async ({ clock }) => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		store.add(entry(10))

		await clock.advance(499)

		expect(new EventStore(storage).entries).toEqual([])

		await clock.advance(1)

		expect(texts(new EventStore(storage))).toEqual(['input at 10'])
	})

	it('deletes the kept events at once when "Preserve" goes off, and keeps the events on screen', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		store.add(entry(10))

		store.save()

		store.setPreserve(false)

		expect(texts(store)).toEqual(['input at 10'])

		expect(new EventStore(storage).entries).toEqual([])
	})

	it(`keeps the newest ${CAPACITY} events, and each event with a report`, () => {
		const store = new EventStore(createStorage())

		store.file(entry(0, 'error'), { origin: 'window', error: errorWith('boom') })

		for (let time = 1; time < CAPACITY + 5; time++) store.add(entry(time))

		expect(store.entries).toHaveLength(CAPACITY + 1)

		expect(texts(store).slice(0, 2)).toEqual(['error at 0', 'input at 5'])
	})

	it(`keeps the newest ${REPORTS} reports`, () => {
		const store = new EventStore(createStorage())

		for (let time = 0; time < REPORTS + 2; time++)
			store.file(entry(time, 'error'), { origin: 'window', error: errorWith(`boom ${time}`) })

		expect(store.entries.filter(({ report }) => report)).toHaveLength(REPORTS)

		expect(texts(store)[0]).toBe('error at 2')
	})

	it('puts a late event in its time order, but not before the separator of its page load', () => {
		const store = new EventStore(createStorage())

		store.separate('first load')

		store.add(entry(900))

		store.separate('second load')

		store.add(entry(40))

		store.add(entry(20, 'paint'))

		expect(texts(store)).toEqual([
			'first load',
			'input at 900',
			'second load',
			'paint at 20',
			'input at 40',
		])
	})

	it('empties the events and the kept copy on Clear', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		store.add(entry(10))

		store.save()

		store.clear()

		expect(store.entries).toEqual([])

		expect(new EventStore(storage).entries).toEqual([])
	})

	it('adds no event while it is paused, but adds the event of a bug', () => {
		const store = new EventStore(createStorage())

		store.add(entry(10))

		store.setPaused(true)

		store.add(entry(20))

		store.file(entry(25, 'error'), { origin: 'window', error: errorWith('boom') })

		store.setPaused(false)

		store.add(entry(30))

		expect(texts(store)).toEqual(['input at 10', 'error at 25', 'input at 30'])
	})

	it('tells its listeners about each change', () => {
		const store = new EventStore(createStorage())

		const listener = vi.fn()

		const unsubscribe = store.subscribe(listener)

		store.add(entry(10))

		store.setPreserve(true)

		store.clear()

		unsubscribe()

		store.add(entry(20))

		expect(listener).toHaveBeenCalledTimes(3)
	})

	it('keeps the newest events that fit when the storage is full', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		for (let time = 0; time < 8; time++) store.add(entry(time))

		store.save()

		// The storage now holds at most three events.
		const limit = JSON.stringify(store.entries.slice(-3)).length

		const full: EventStorage = {
			...storage,
			setItem: (key, value) => {
				if (value.length > limit) throw new DOMException('full', 'QuotaExceededError')

				storage.setItem(key, value)
			},
		}

		const kept = new EventStore(full)

		kept.add(entry(8))

		kept.save()

		expect(texts(new EventStore(storage))).toEqual(['input at 7', 'input at 8'])
	})

	it('lives for the page when the storage throws', () => {
		const store = new EventStore(blocked)

		store.setPreserve(true)

		store.add(entry(10))

		store.save()

		expect(store.preserve).toBe(false)

		expect(texts(store)).toEqual(['input at 10'])
	})
})

describe('EventStore bugs', () => {
	it('files a report with the origin, the stack, the page, and the last lines', () => {
		const store = new EventStore(createStorage())

		for (let time = 0; time < TRAIL + 5; time++) store.add(entry(time))

		store.file(entry(100, 'error'), {
			origin: 'caught',
			error: errorWith('boom'),
			componentStack: '\n    at Page (page.tsx:3:9)',
		})

		const bug = store.entries.at(-1)

		expect(bug?.report).toMatchObject({
			origin: 'caught',
			stack: ['at rows (grid.js:1:2)'],
			componentStack: ['at Page (page.tsx:3:9)'],
			count: 1,
			page: location.pathname + location.search + location.hash,
			hash: expect.stringMatching(/^[0-9a-f]{7}$/),
		})

		// The trail holds the last lines before the bug, not the bug.
		expect(bug?.report?.trail).toHaveLength(TRAIL)

		expect(bug?.report?.trail.at(-1)).toMatch(/input at 44$/)
	})

	it('counts the same bug in its first report, and files a new report for another first frame', () => {
		const store = new EventStore(createStorage())

		const bug = (time: number): NewEntry => ({ time, kind: 'error', text: 'window boom', y: 0 })

		store.file(bug(10), { origin: 'window', error: errorWith('boom') })

		store.file(bug(20), { origin: 'window', error: errorWith('boom') })

		store.file(bug(30), {
			origin: 'window',
			error: errorWith('boom', 'at cells (grid.js:9:9)'),
		})

		expect(store.entries.map(({ report }) => report?.count)).toEqual([2, undefined, 1])
	})

	it('adds what a second channel tells about the same thrown value to the first report, with no new event', () => {
		const store = new EventStore(createStorage())

		const error = errorWith('boom')

		store.file(entry(10, 'error'), {
			origin: 'caught',
			error,
			componentStack: '\n    at Page (page.tsx:3:9)',
		})

		store.file(entry(11, 'error'), { origin: 'route', error, route: '/:page' })

		store.file(entry(12, 'error'), { origin: 'window', error })

		expect(store.entries).toHaveLength(1)

		expect(store.entries[0]?.report).toMatchObject({
			origin: 'caught',
			route: '/:page',
			componentStack: ['at Page (page.tsx:3:9)'],
		})
	})

	it('removes the report of an event, and keeps the event', () => {
		const store = new EventStore(createStorage())

		store.file(entry(10, 'error'), { origin: 'window', error: errorWith('boom') })

		const [bug] = store.entries

		store.removeReport(bug?.id ?? 0)

		expect(store.entries).toHaveLength(1)

		expect(store.entries[0]?.report).toBeUndefined()
	})
})

describe('EventStore capture', () => {
	it('files a capture with each event from its start, and the start in the report', () => {
		const store = new EventStore(createStorage())

		for (let time = 0; time < TRAIL + 5; time++) store.add(entry(time))

		now(500)

		store.startCapture()

		expect(store.capturing).toBe(true)

		for (let time = 0; time < TRAIL + 5; time++) store.add(entry(1000 + time))

		now(2000)

		const id = store.stopCapture()

		expect(store.capturing).toBe(false)

		const capture = store.entries.find((item) => item.id === id)

		expect(capture?.report?.origin).toBe('capture')

		expect(capture?.report?.started).toMatch(new RegExp(`Z ${location.pathname}$`))

		// The capture start and each event after it, and none before it.
		expect(capture?.report?.trail).toHaveLength(TRAIL + 6)

		expect(capture?.report?.trail[0]).toContain(`capture starts ${location.pathname}`)
	})

	it('runs through a reload, and keeps the events with "Preserve" off', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		now(5)

		store.startCapture()

		expect(store.preserve).toBe(true)

		store.add(entry(10))

		store.save()

		const reloaded = new EventStore(storage)

		expect(reloaded.capturing).toBe(true)

		reloaded.add(entry(20))

		now(30)

		reloaded.stopCapture()

		expect(reloaded.entries.at(-1)?.report?.trail).toEqual([
			expect.stringContaining('capture starts'),
			expect.stringContaining('input at 10'),
			expect.stringContaining('input at 20'),
		])

		// "Preserve" is off, so the end of the capture drops the kept copy.
		expect(reloaded.preserve).toBe(false)

		expect(new EventStore(storage).entries).toEqual([])
	})

	it(`keeps up to ${CAPTURE_CAPACITY} events while it runs, and gives each bug the trail from its start`, () => {
		const store = new EventStore(createStorage())

		now(0)

		store.startCapture()

		for (let time = 1; time <= CAPACITY + 10; time++) store.add(entry(time))

		expect(store.entries).toHaveLength(CAPACITY + 11)

		store.file(entry(5000, 'error'), { origin: 'window', error: errorWith('boom') })

		expect(store.entries.at(-1)?.report?.trail).toHaveLength(CAPACITY + 11)
	})

	it('returns no id when no capture runs', () => {
		expect(new EventStore(createStorage()).stopCapture()).toBeUndefined()
	})
})
