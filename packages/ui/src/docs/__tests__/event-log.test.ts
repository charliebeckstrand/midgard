import { notifyOverlaySignal } from 'ui/primitives/overlay'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { componentEvent } from '../debug/event-log/component-events.ts'
import {
	begin,
	CAPACITY,
	type Entry,
	EventLog,
	listen,
	OWN,
	type Store,
} from '../debug/event-log/recorder.ts'

/** A `sessionStorage` in memory. A new log on the same store is a reload of the tab. */
function createStore(): Store {
	const items = new Map<string, string>()

	return {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value)
		},
		removeItem: (key) => {
			items.delete(key)
		},
	}
}

/** A store whose each access throws, as with site data off. */
const blocked: Store = {
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

function entry(time: number, kind: Entry['kind'] = 'input'): Entry {
	return { time, kind, text: `${kind} at ${time}`, y: 0 }
}

/** The texts of the entries of a log, oldest first. */
function texts(log: EventLog): string[] {
	return log.entries.map((line) => line.text)
}

/** Starts the listeners of a log, which the test stops when it ends. */
function listenTo(log: EventLog): void {
	onTestFinished(listen(log))
}

afterEach(() => {
	vi.useRealTimers()
})

describe('EventLog', () => {
	it('keeps no entries through a reload while "Preserve log" is off', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.add(entry(10))

		log.save()

		expect(new EventLog(store).entries).toEqual([])
	})

	it('keeps the entries through a reload while "Preserve log" is on', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		log.add(entry(10))

		log.save()

		const reloaded = new EventLog(store)

		expect(reloaded.preserve).toBe(true)

		expect(reloaded.entries).toEqual([entry(10)])
	})

	it('saves the entries 500 ms after the last entry', () => {
		vi.useFakeTimers()

		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		log.add(entry(10))

		vi.advanceTimersByTime(499)

		expect(new EventLog(store).entries).toEqual([])

		vi.advanceTimersByTime(1)

		expect(new EventLog(store).entries).toEqual([entry(10)])
	})

	it('deletes the kept entries at once when "Preserve log" goes off, and keeps the lines on screen', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		log.add(entry(10))

		log.save()

		log.preserve = false

		expect(log.entries).toEqual([entry(10)])

		const reloaded = new EventLog(store)

		expect(reloaded.preserve).toBe(false)

		expect(reloaded.entries).toEqual([])
	})

	it(`keeps the newest ${CAPACITY} entries, also through a reload`, () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		for (let time = 0; time < CAPACITY + 5; time++) log.add(entry(time))

		expect(log.entries).toHaveLength(CAPACITY)

		expect(log.entries[0]).toEqual(entry(5))

		log.save()

		expect(new EventLog(store).entries).toHaveLength(CAPACITY)
	})

	it('puts a late entry in its time order, but not before the separator of its page load', () => {
		const log = new EventLog(createStore())

		log.separate('first load')

		log.add(entry(900))

		log.separate('second load')

		log.add(entry(40))

		log.add(entry(20, 'paint'))

		expect(texts(log)).toEqual([
			'first load',
			'input at 900',
			'second load',
			'paint at 20',
			'input at 40',
		])
	})

	it('empties the lines and the kept copy on Clear', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		log.add(entry(10))

		log.save()

		log.clear()

		expect(log.entries).toEqual([])

		expect(new EventLog(store).entries).toEqual([])
	})

	it('adds no entry while it is paused', () => {
		const log = new EventLog(createStore())

		log.add(entry(10))

		log.paused = true

		log.add(entry(20))

		log.paused = false

		log.add(entry(30))

		expect(log.entries.map(({ time }) => time)).toEqual([10, 30])
	})

	it('tells its listeners about each change', () => {
		const log = new EventLog(createStore())

		const listener = vi.fn()

		const unsubscribe = log.subscribe(listener)

		log.add(entry(10))

		log.preserve = true

		log.clear()

		unsubscribe()

		log.add(entry(20))

		expect(listener).toHaveBeenCalledTimes(3)
	})

	it('lives for the page when the storage throws', () => {
		const log = new EventLog(blocked)

		log.preserve = true

		log.add(entry(10))

		log.save()

		expect(log.preserve).toBe(false)

		expect(log.entries).toEqual([entry(10)])
	})
})

describe('begin', () => {
	afterEach(() => {
		delete window.__eventLog
	})

	it('writes the separator and the readings of the load, and takes the buffer of the head script', () => {
		const stop = vi.fn()

		const early: Entry = { time: 1, kind: 'scroll', text: 'scroll before hydration', y: 30 }

		window.__eventLog = { entries: [early], stop }

		const log = new EventLog(createStore())

		begin(log)

		const [separator, buffered, readings] = log.entries

		expect(separator?.kind).toBe('load')

		expect(separator?.text).toContain(location.pathname)

		expect(buffered).toEqual(early)

		expect(readings?.kind).toBe('load')

		expect(readings?.text).toMatch(/^restore \w+ kept y /)

		expect(stop).toHaveBeenCalledOnce()

		expect(window.__eventLog).toBeUndefined()
	})
})

describe('listen', () => {
	it('records the input events of a tap, and a default that a script cancels', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		listenTo(log)

		const button = attach(document.createElement('button'))

		button.addEventListener('click', (event) => event.preventDefault())

		button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		vi.runOnlyPendingTimers()

		expect(texts(log)).toEqual([
			'pointerdown button synthetic',
			'click button synthetic',
			'click cancelled',
		])
	})

	it('skips the events in its own button, and records the others', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		const button = document.createElement('span')

		button.setAttribute(OWN, '')

		const own = attach(button).appendChild(document.createElement('button'))

		own.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(log.entries).toEqual([])

		attach(document.createElement('button')).dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		)

		expect(texts(log)).toEqual(['click button synthetic'])
	})

	it('records the start and the end of a scroll', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		listenTo(log)

		document.dispatchEvent(new Event('scroll'))

		document.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(150)

		expect(texts(log)).toEqual(['scroll starts page', 'scroll ends'])
	})

	it('records errors, unhandled rejections, and an overlay that opens', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }))

		window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'gone' }))

		notifyOverlaySignal()

		expect(log.entries.map((line) => line.kind)).toEqual(['error', 'error', 'overlay'])

		expect(texts(log).slice(0, 2)).toEqual(['boom', 'unhandled rejection gone'])
	})

	it('records the callbacks that a page gives to a component or a module, and stops with the log', () => {
		const log = new EventLog(createStore())

		const stop = listen(log)

		componentEvent('component', 'Tab onPreload', vi.fn<(value: string) => void>())('Activity')

		componentEvent('module', 'Grid onSortChange', vi.fn<(value: string) => void>())('name')

		stop()

		componentEvent('component', 'Tab onPreload', vi.fn<(value: string) => void>())('Billing')

		expect(log.entries.map(({ kind, text }) => [kind, text])).toEqual([
			['component', 'Tab onPreload("Activity")'],
			['module', 'Grid onSortChange("name")'],
		])
	})

	it('records a script call that moves the focus, and restores the method when it stops', () => {
		const native = HTMLElement.prototype.focus

		const log = new EventLog(createStore())

		const stop = listen(log)

		attach(document.createElement('button')).focus()

		stop()

		expect(texts(log)[0]).toMatch(/^focus button \[\] from /)

		expect(HTMLElement.prototype.focus).toBe(native)
	})

	it('saves the entries on pagehide while "Preserve log" is on', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		listenTo(log)

		log.add(entry(10))

		window.dispatchEvent(new Event('pagehide'))

		expect(new EventLog(store).entries).toEqual([entry(10)])
	})
})
