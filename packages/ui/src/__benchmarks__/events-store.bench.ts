import { bench, describe } from 'vitest'
import {
	CAPTURE_CAPACITY,
	EVENT_CAPACITY,
	EventStore,
	type NewEntry,
} from '../modules/events/engine/events-store'
import { formatRow, getKindWidth, groupRows } from '../modules/events/engine/events-text'
import type { EventStorage } from '../modules/events/engine/types'

/**
 * What the store of the events costs an app while the events run. Each
 * browser operation, such as a tap with its eight input events, writes one
 * event per line, so `add` runs on the input path of the app. The store holds
 * {@link EVENT_CAPACITY} events outside a capture and {@link CAPTURE_CAPACITY} while
 * one runs, so each rung runs on a store that is full: the steady state of a
 * session, where each new event drops the oldest.
 *
 * The other rungs are the work that a full store does less often: the write
 * of the kept copy (`save`, after each burst while "Preserve" is on), the
 * filing of a bug with its trail, and the rows and the Copy text of the list
 * (each frame of a live view, and each Copy).
 *
 * The storage is a `Map`, so the rungs read the store and not the storage of
 * jsdom. The findings are in the Events section of
 * [`browser/README.md`](browser/README.md).
 */

/** A storage in memory. */
function memoryStorage(): EventStorage {
	const map = new Map<string, string>()

	return {
		getItem: (name) => map.get(name) ?? null,
		setItem: (name, value) => {
			map.set(name, value)
		},
		removeItem: (name) => {
			map.delete(name)
		},
	}
}

/** The detail of a network line: a resource timing of about twenty fields, as the network source writes it. */
const TIMING = {
	name: 'https://example.test/assets/chunk-3f9a0c1.js',
	entryType: 'resource',
	startTime: 1204,
	duration: 38,
	initiatorType: 'script',
	nextHopProtocol: 'h2',
	workerStart: 0,
	redirectStart: 0,
	redirectEnd: 0,
	fetchStart: 1204,
	domainLookupStart: 1204,
	domainLookupEnd: 1204,
	connectStart: 1204,
	connectEnd: 1204,
	secureConnectionStart: 0,
	requestStart: 1210,
	responseStart: 1236,
	responseEnd: 1242,
	transferSize: 4120,
	encodedBodySize: 3820,
	decodedBodySize: 11204,
	responseStatus: 200,
}

/**
 * The `index`-th event of a session: mostly the input lines of taps in
 * batches of eight, with a scroll, a network load, and a viewport line
 * between them.
 */
function entryAt(index: number): NewEntry {
	const time = index * 4

	const y = (index * 13) % 2000

	switch (index % 12) {
		case 8:
			return { time, y, kind: 'scroll', text: 'scroll starts page', batch: `s${index}` }
		case 9:
			return {
				time,
				y,
				kind: 'network',
				text: 'chunk-3f9a0c1.js 38 ms',
				detail: TIMING,
				batch: `n${index}`,
			}
		case 10:
			return { time, y, kind: 'viewport', text: `page height ${3000 + index}` }
		case 11:
			return { time, y, kind: 'route', text: '/components/button' }
		default:
			return {
				time,
				y,
				kind: 'input',
				text: `pointerdown button[button]`,
				batch: `t${Math.floor(index / 12)}`,
			}
	}
}

/** A store full to `count` events, with the next index to add. */
function fullStore(count: number, { capture = false, preserve = false } = {}) {
	const store = new EventStore(memoryStorage())

	if (preserve) store.setPreserve(true)

	if (capture) store.startCapture()

	for (let index = 0; index < count; index++) store.add(entryAt(index))

	// Each add arms the timer of the kept copy; the rungs time the add, not the timer.
	return { store, next: count }
}

describe('events-store · add (one line of a full store)', () => {
	const full = fullStore(EVENT_CAPACITY)

	bench(`${EVENT_CAPACITY} events`, () => {
		full.store.add(entryAt(full.next++))
	})

	const capturing = fullStore(CAPTURE_CAPACITY, { capture: true })

	bench(`${CAPTURE_CAPACITY} events · capture`, () => {
		capturing.store.add(entryAt(capturing.next++))
	})
})

describe('events-store · save (the kept copy)', () => {
	const full = fullStore(EVENT_CAPACITY, { preserve: true })

	bench(`${EVENT_CAPACITY} events`, () => {
		full.store.save()
	})

	const capturing = fullStore(CAPTURE_CAPACITY, { capture: true })

	bench(`${CAPTURE_CAPACITY} events · capture`, () => {
		capturing.store.save()
	})
})

describe('events-text · the rows and the Copy text of the list', () => {
	for (const count of [EVENT_CAPACITY, CAPTURE_CAPACITY]) {
		const { entries } = fullStore(count, { capture: count > EVENT_CAPACITY }).store

		bench(`groupRows + getKindWidth · ${count} events`, () => {
			groupRows(entries, true)

			getKindWidth(entries)
		})

		const rows = groupRows(entries, true)

		const width = getKindWidth(entries)

		bench(`Copy text · ${count} events`, () => {
			rows.map((row) => formatRow(row, width)).join('\n')
		})
	}
})
