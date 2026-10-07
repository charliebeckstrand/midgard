import { notifyOverlaySignal } from 'ui/primitives/overlay'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { BugLog } from '../debug/bug-log/log.ts'
import { onCaughtError } from '../debug/event-log/caught-errors.ts'
import { componentEvent } from '../debug/event-log/component-events.ts'
import { CAPACITY, type Entry, EventLog, OWN } from '../debug/event-log/log.ts'
import type { Store } from '../debug/journal.ts'
import { begin, listen } from '../debug/recorder.ts'

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

/** Starts the listeners of a log and of its Bug log, and returns a function that stops them. */
function listenOn(log: EventLog): () => void {
	return listen({ log, bugs: new BugLog(createStore(), log) })
}

/** Starts the listeners of a log, which the test stops when it ends. */
function listenTo(log: EventLog): void {
	onTestFinished(listenOn(log))
}

afterEach(() => {
	vi.useRealTimers()
})

describe('EventLog', () => {
	it('keeps no entries through a reload while "Preserve" is off', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.add(entry(10))

		log.save()

		expect(new EventLog(store).entries).toEqual([])
	})

	it('keeps the entries through a reload while "Preserve" is on', () => {
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

	it('deletes the kept entries at once when "Preserve" goes off, and keeps the lines on screen', () => {
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

	it('keeps the newest entries that fit when the storage is full', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		for (let time = 0; time < 8; time++) log.add(entry(time))

		log.save()

		// The storage now holds at most three entries.
		const limit = JSON.stringify(log.entries.slice(-3)).length

		const full: Store = {
			...store,
			setItem: (key, value) => {
				if (value.length > limit) throw new DOMException('full', 'QuotaExceededError')

				store.setItem(key, value)
			},
		}

		const kept = new EventLog(full)

		kept.entries = log.entries

		kept.add(entry(8))

		kept.save()

		expect(new EventLog(store).entries).toEqual([entry(7), entry(8)])
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

		expect(readings?.text).toMatch(/^restore \w+ kept y \S+$/)

		expect(readings?.detail).toMatchObject({
			visual: expect.any(Object),
			window: window.innerHeight,
			safe: { top: 0, bottom: 0 },
		})

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

	it('writes no line that a source writes after the stop', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		const stop = listenOn(log)

		const button = attach(document.createElement('button'))

		button.addEventListener('click', (event) => event.preventDefault())

		button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		stop()

		// The line of the cancelled default comes from a timer after the stop.
		vi.runOnlyPendingTimers()

		expect(texts(log)).toEqual(['click button synthetic'])
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

	it('records a key with its modifiers, and the key in the detail', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		const button = attach(document.createElement('button'))

		button.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', shiftKey: true, bubbles: true }),
		)

		button.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Shift',
				code: 'ShiftLeft',
				shiftKey: true,
				bubbles: true,
			}),
		)

		button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))

		expect(texts(log)).toEqual([
			'keydown Shift+Tab button synthetic',
			'keydown Shift button synthetic',
			'keydown Space button synthetic',
		])

		expect(log.entries[0]?.detail).toEqual({ key: 'Tab', code: 'Tab', repeat: false })
	})

	it('records the start and the end of a scroll', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		listenTo(log)

		document.dispatchEvent(new Event('scroll'))

		document.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(150)

		document.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(150)

		expect(texts(log)).toEqual([
			'scroll starts page',
			'scroll ends',
			'scroll starts page',
			'scroll ends',
		])

		// The start and the end of one scroll are one batch.
		const [first, end, second] = log.entries.map(({ batch }) => batch)

		expect(first).toBeDefined()

		expect(end).toBe(first)

		expect(second).not.toBe(first)
	})

	it('batches the input events of one gesture, from its start to its end', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		listenTo(log)

		const button = attach(document.createElement('button'))

		button.addEventListener('click', (event) => event.preventDefault())

		for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
			button.dispatchEvent(new PointerEvent(type, { bubbles: true }))

		button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		// No gesture is open after the click.
		button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

		vi.runOnlyPendingTimers()

		const batches = log.entries.map(({ text, batch }) => [text, batch])

		const tap = batches[0]?.[1]

		expect(batches).toEqual([
			['pointerdown button synthetic', tap],
			['pointerup button synthetic', tap],
			['mousedown button synthetic', tap],
			['mouseup button synthetic', tap],
			['click button synthetic', tap],
			['focusin button synthetic', undefined],
			['keydown Enter button synthetic', expect.not.stringMatching(`^${tap}$`)],
			// The cancelled default takes the batch of its event.
			['click cancelled', tap],
		])
	})

	it('records errors, unhandled rejections, and an overlay that opens', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		const error = new Error('boom')

		window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error }))

		window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'gone' }))

		notifyOverlaySignal()

		expect(log.entries.map((line) => line.kind)).toEqual(['error', 'error', 'overlay'])

		expect(texts(log)).toEqual(['boom', 'unhandled rejection gone', 'overlay opens'])

		// An `Error` gives its stack. A thrown value that is not an `Error` has none.
		expect(log.entries[0]?.detail).toEqual({ stack: expect.arrayContaining(['Error: boom']) })

		expect(log.entries[1]?.detail).toBeUndefined()

		expect(log.entries[2]?.detail).toMatchObject({ window: window.innerHeight })
	})

	it('records an error that an error boundary catches, with its first component frame', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		const console = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {})

		onTestFinished(() => console.mockRestore())

		const error = new Error('boom')

		onCaughtError(error, {
			componentStack: '\n    at Page (page.tsx:3:9)\n    at Layout (root.tsx:8:2)',
		})

		expect(log.entries.map(({ kind, text }) => `${kind} ${text}`)).toEqual([
			'error caught boom at Page (page.tsx:3:9)',
		])

		expect(log.entries[0]?.detail).toEqual({
			stack: expect.arrayContaining(['Error: boom']),
			componentStack: ['at Page (page.tsx:3:9)', 'at Layout (root.tsx:8:2)'],
		})

		// The error goes to the console, as the default of React does.
		expect(console).toHaveBeenCalledWith(error)
	})

	it('records the page lifecycle, and a restore from the back-forward cache as a new page load', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		document.dispatchEvent(new Event('visibilitychange'))

		window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))

		window.dispatchEvent(new PageTransitionEvent('pageshow'))

		expect(log.entries.every(({ kind }) => kind === 'load')).toBe(true)

		expect(texts(log)).toEqual([
			`visibility ${document.visibilityState}`,
			'pagehide persisted',
			`──── back-forward cache ${location.pathname}`,
			expect.stringMatching(/^restore \w+ kept y \S+$/),
			'pageshow',
		])

		expect(log.entries[3]?.detail).toMatchObject({ window: window.innerHeight })
	})

	it('records the scripts and links that load, at their start times, with their timings', () => {
		type Callback = (list: { getEntries: () => PerformanceEntry[] }) => void

		// The callbacks of the observers of `resource` entries.
		const observers: Callback[] = []

		vi.stubGlobal(
			'PerformanceObserver',
			Object.assign(
				class {
					private readonly callback: Callback

					constructor(callback: Callback) {
						this.callback = callback
					}

					observe({ type }: { type: string }) {
						if (type === 'resource') observers.push(this.callback)
					}

					disconnect() {}
				},
				{ supportedEntryTypes: ['paint', 'resource'] },
			),
		)

		onTestFinished(() => {
			vi.unstubAllGlobals()
		})

		const log = new EventLog(createStore())

		listenTo(log)

		const resource = (fields: Partial<PerformanceResourceTiming>) =>
			({ toJSON: () => ({ duration: 12.4 }), ...fields }) as PerformanceResourceTiming

		const timings = [
			resource({
				name: 'https://docs.test/assets/page-a1.js',
				initiatorType: 'script',
				startTime: 30,
				duration: 12.4,
				transferSize: 900,
				decodedBodySize: 2000,
				responseStatus: 200,
			}),
			resource({
				name: 'https://docs.test/assets/kit-b2.js',
				initiatorType: 'link',
				startTime: 20,
				duration: 3,
				transferSize: 0,
				decodedBodySize: 2000,
				responseStatus: 200,
			}),
			resource({
				name: 'https://docs.test/assets/gone-c3.js',
				initiatorType: 'script',
				startTime: 40,
				duration: 5,
				transferSize: 300,
				decodedBodySize: 0,
				responseStatus: 404,
			}),
			resource({
				name: 'https://docs.test/logo.png',
				initiatorType: 'img',
				startTime: 10,
				duration: 1,
			}),
		]

		for (const observer of observers) observer({ getEntries: () => timings })

		expect(log.entries.map(({ kind, time, text }) => `${kind} ${time} ${text}`)).toEqual([
			'network 20 kit-b2.js 3 ms cache',
			'network 30 page-a1.js 12 ms',
			'network 40 gone-c3.js 5 ms failed 404',
		])

		expect(log.entries[1]?.detail).toEqual({ duration: 12 })
	})

	it('records a resource that fails to load with its element and its URL', () => {
		const log = new EventLog(createStore())

		listenTo(log)

		const script = attach(
			Object.assign(document.createElement('script'), { src: '/assets/chunk.js' }),
		)

		script.dispatchEvent(new Event('error'))

		expect(log.entries.map(({ kind, text }) => `${kind} ${text}`)).toEqual([
			'error load fails script /assets/chunk.js',
		])
	})

	it('records the callbacks that a page gives to a component or a module, and stops with the log', () => {
		const log = new EventLog(createStore())

		const stop = listenOn(log)

		componentEvent('component', 'Tab', 'onPreload', vi.fn<(value: string) => void>())('Activity')

		componentEvent('module', 'Grid', 'onSortChange', vi.fn<(value: string) => void>())('name')

		stop()

		componentEvent('component', 'Tab', 'onPreload', vi.fn<(value: string) => void>())('Billing')

		expect(log.entries.map(({ kind, name, text, detail }) => [kind, name, text, detail])).toEqual([
			['component', 'Tab', 'onPreload("Activity")', ['Activity']],
			['module', 'Grid', 'onSortChange("name")', ['name']],
		])
	})

	it('batches the calls of one callback of one component while they come less than 150 ms apart', () => {
		vi.useFakeTimers()

		const log = new EventLog(createStore())

		listenTo(log)

		const onSortChange = componentEvent('module', 'Grid', 'onSortChange', vi.fn())

		const onPageChange = componentEvent('module', 'Grid', 'onPageChange', vi.fn())

		onSortChange('name')

		vi.advanceTimersByTime(100)

		onSortChange('age')

		onPageChange(2)

		vi.advanceTimersByTime(150)

		onSortChange('name')

		const [a, b, page, c] = log.entries.map(({ batch }) => batch)

		expect(b).toBe(a)

		expect(new Set([a, page, c]).size).toBe(3)
	})

	it('records a script call that moves the focus, and restores the method when it stops', () => {
		const native = HTMLElement.prototype.focus

		const log = new EventLog(createStore())

		const stop = listenOn(log)

		attach(document.createElement('button')).focus()

		stop()

		expect(texts(log)[0]).toMatch(/^focus button \[\] from /)

		// The line holds two frames of the caller, and the detail the full stack.
		const stack = (log.entries[0]?.detail as { stack: string[] } | undefined)?.stack ?? []

		expect(stack.length).toBeGreaterThan(2)

		expect(texts(log)[0]).toContain(stack.slice(0, 2).join(' < '))

		expect(HTMLElement.prototype.focus).toBe(native)
	})

	it('saves the entries on pagehide while "Preserve" is on, with the pagehide line', () => {
		const store = createStore()

		const log = new EventLog(store)

		log.preserve = true

		listenTo(log)

		log.add(entry(10))

		window.dispatchEvent(new Event('pagehide'))

		expect(texts(new EventLog(store))).toEqual(['input at 10', 'pagehide'])
	})
})
