import { describe, expect, onTestFinished, vi } from 'vitest'
import { begin, halt, listen, start } from '../../modules/events/engine/events-recorder'
import {
	eventsRootOptions,
	getEventSink,
	recordEvent,
	reportBug,
} from '../../modules/events/engine/events-sink'
import { EventStore, type NewEntry } from '../../modules/events/engine/events-store'
import { TOOL_ATTRIBUTE } from '../../modules/events/engine/events-target'
import { notifyOverlaySignal } from '../../primitives/overlay/overlay-signal'
import { attach } from '../helpers/attach'
import { createStorage } from '../helpers/event-storage'
import { it } from '../helpers/fake-clock'

function entry(time: number): NewEntry {
	return { time, kind: 'input', text: `input at ${time}`, y: 0 }
}

/** The texts of the events of a store, oldest first. */
function texts(store: EventStore): string[] {
	return store.entries.map(({ text }) => text)
}

/** Runs the sources into a new store, which the test stops when it ends. */
function listenTo(options?: Parameters<typeof listen>[1]): EventStore {
	const store = new EventStore(createStorage())

	onTestFinished(listen(store, options))

	return store
}

describe('begin', () => {
	it('writes the separator of the page load and the reading of the viewport', () => {
		const store = new EventStore(createStorage())

		begin(store)

		const [separator, reading] = store.entries

		expect(separator?.kind).toBe('load')

		expect(separator?.text).toMatch(new RegExp(`^──── \\w+ ${location.pathname}$`))

		expect(reading).toMatchObject({ kind: 'load', text: 'viewport' })

		expect(reading?.detail).toMatchObject({
			visual: expect.any(Object),
			window: window.innerHeight,
			safe: { top: 0, bottom: 0 },
		})
	})

	it('names the cause in place of the navigation type', () => {
		const store = new EventStore(createStorage())

		begin(store, 'on')

		expect(texts(store)[0]).toBe(`──── on ${location.pathname}`)
	})
})

describe('listen', () => {
	it('records the input events of a tap, and a default that a script cancels', async ({
		clock,
	}) => {
		const store = listenTo()

		const button = attach(document.createElement('button'))

		button.addEventListener('click', (event) => event.preventDefault())

		button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		await clock.runPending()

		expect(texts(store)).toEqual([
			'pointerdown button synthetic',
			'click button synthetic',
			'click cancelled',
		])
	})

	it('writes no event that a source writes after the stop', async ({ clock }) => {
		const store = new EventStore(createStorage())

		const stop = listen(store)

		const button = attach(document.createElement('button'))

		button.addEventListener('click', (event) => event.preventDefault())

		button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		stop()

		// The line of the cancelled default comes from a timer after the stop.
		await clock.runPending()

		expect(texts(store)).toEqual(['click button synthetic'])
	})

	it('skips the events in its own tools, and records the others', () => {
		const store = listenTo()

		const tool = attach(document.createElement('span'))

		tool.setAttribute(TOOL_ATTRIBUTE, '')

		tool
			.appendChild(document.createElement('button'))
			.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(store.entries).toEqual([])

		attach(document.createElement('button')).dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		)

		expect(texts(store)).toEqual(['click button synthetic'])
	})

	it('records a key with its modifiers, and the key in the detail', () => {
		const store = listenTo()

		const button = attach(document.createElement('button'))

		button.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', shiftKey: true, bubbles: true }),
		)

		button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))

		expect(texts(store)).toEqual([
			'keydown Shift+Tab button synthetic',
			'keydown Space button synthetic',
		])

		expect(store.entries[0]?.detail).toEqual({ key: 'Tab', code: 'Tab', repeat: false })
	})

	it('records the start and the end of a scroll as one batch', async ({ clock }) => {
		const store = listenTo()

		document.dispatchEvent(new Event('scroll'))

		document.dispatchEvent(new Event('scroll'))

		await clock.advance(150)

		document.dispatchEvent(new Event('scroll'))

		await clock.advance(150)

		expect(texts(store)).toEqual([
			'scroll starts page',
			'scroll ends',
			'scroll starts page',
			'scroll ends',
		])

		const [first, end, second] = store.entries.map(({ batch }) => batch)

		expect(first).toBeDefined()

		expect(end).toBe(first)

		expect(second).not.toBe(first)
	})

	it('files a bug for an error, an unhandled rejection, and a resource that fails to load, also while it is paused', () => {
		const store = listenTo()

		store.setPaused(true)

		window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))

		window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'gone' }))

		attach(
			Object.assign(document.createElement('script'), { src: '/assets/chunk.js' }),
		).dispatchEvent(new Event('error'))

		expect(store.entries.map(({ kind, text, report }) => [kind, text, report?.origin])).toEqual([
			['error', 'boom', 'window'],
			['error', 'unhandled rejection gone', 'window'],
			['error', 'load fails script /assets/chunk.js', 'window'],
		])

		// An `Error` gives its stack. A thrown value that is not an `Error` has none.
		expect(store.entries[0]?.report?.stack.length).toBeGreaterThan(0)

		expect(store.entries[0]?.detail).toMatchObject({ stack: expect.any(Array) })

		expect(store.entries[1]?.report?.stack).toEqual([])

		expect(store.entries[1]?.detail).toBeUndefined()
	})

	it('records an overlay that opens, with the reading of the viewport', () => {
		const store = listenTo()

		notifyOverlaySignal()

		expect(store.entries.map(({ kind, text }) => `${kind} ${text}`)).toEqual([
			'overlay overlay opens',
		])

		expect(store.entries[0]?.detail).toMatchObject({ window: window.innerHeight })
	})

	it('keeps one probe of the viewport in the tools while it runs, and removes it when it stops', () => {
		const probes = () => document.body.querySelectorAll(`:scope > [${TOOL_ATTRIBUTE}][aria-hidden]`)

		const stop = listen(new EventStore(createStorage()))

		const [probe] = probes()

		notifyOverlaySignal()

		window.dispatchEvent(new Event('resize'))

		expect([...probes()]).toEqual([probe])

		stop()

		expect(probes()).toHaveLength(0)
	})

	it('records a move through the session history', () => {
		const store = listenTo()

		window.dispatchEvent(new PopStateEvent('popstate'))

		expect(store.entries.map(({ kind, text }) => `${kind} ${text}`)).toEqual([
			`route popstate ${location.pathname}${location.hash}`,
		])
	})

	it('records the page lifecycle, and a restore from the back-forward cache as a new page load', () => {
		const store = listenTo()

		document.dispatchEvent(new Event('visibilitychange'))

		window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))

		window.dispatchEvent(new PageTransitionEvent('pageshow'))

		expect(store.entries.every(({ kind }) => kind === 'load')).toBe(true)

		expect(texts(store)).toEqual([
			`visibility ${document.visibilityState}`,
			'pagehide persisted',
			`──── back-forward cache ${location.pathname}`,
			'viewport',
			'pageshow',
		])
	})

	it('runs the sources of the app after its own', () => {
		const store = listenTo({
			sources: [
				(note) => {
					note({ kind: 'sync', text: 'sync ends' })

					return () => undefined
				},
			],
		})

		expect(store.entries.map(({ kind, text }) => `${kind} ${text}`)).toEqual(['sync sync ends'])
	})

	it('records a script call that moves the focus only with `calls`, and restores the method when it stops', () => {
		const native = HTMLElement.prototype.focus

		const store = new EventStore(createStorage())

		const stop = listen(store, { calls: true })

		attach(document.createElement('button')).focus()

		stop()

		expect(texts(store)[0]).toMatch(/^focus button \[\] from /)

		expect(HTMLElement.prototype.focus).toBe(native)

		const plain = listenTo()

		attach(document.createElement('button')).focus()

		expect(plain.entries.filter(({ text }) => text.startsWith('focus button []'))).toEqual([])
	})

	it('names the element of the last pointerdown and focus outside the tools in a report, and skips while paused', () => {
		const store = listenTo()

		const region = attach(document.createElement('div'))

		region.setAttribute('data-slot', 'region')

		const button = region.appendChild(document.createElement('button'))

		button.setAttribute('data-slot', 'button')

		const tool = attach(document.createElement('button'))

		tool.setAttribute(TOOL_ATTRIBUTE, '')

		button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		// A tap on a tool, and a tap while a sheet of the tools is open, do not count.
		tool.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		store.setPaused(true)

		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		reportBug(new Error('boom'))

		const report = store.entries.find((item) => item.report)?.report

		expect(report?.pointer).toMatch(/^div\[region\] > button\[button\] at /)

		expect(report?.focus).toMatch(/^div\[region\] > button\[button\] at /)
	})

	it('saves the events on pagehide while "Preserve" is on, with the pagehide line', () => {
		const storage = createStorage()

		const store = new EventStore(storage)

		store.setPreserve(true)

		onTestFinished(listen(store))

		store.add(entry(10))

		window.dispatchEvent(new Event('pagehide'))

		expect(texts(new EventStore(storage))).toEqual(['input at 10', 'pagehide'])
	})
})

describe('the sink', () => {
	it('does nothing while the events do not run', () => {
		expect(getEventSink()).toBeUndefined()

		expect(() => {
			recordEvent('sync', 'sync ends')

			reportBug(new Error('boom'))
		}).not.toThrow()
	})

	it('records an event of the app with its detail', () => {
		const store = listenTo()

		recordEvent('sync', 'sync ends', { rows: 3 })

		expect(store.entries.map(({ kind, text, detail }) => [kind, text, detail])).toEqual([
			['sync', 'sync ends', { rows: 3 }],
		])
	})

	it('files a bug from each root callback with its origin and component stack, then does the default of React', () => {
		const store = listenTo()

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		// The test window has no `reportError`.
		const report = vi.fn()

		vi.stubGlobal('reportError', report)

		const caught = new Error('caught')

		const uncaught = new Error('uncaught')

		const recoverable = new Error('recoverable')

		const componentStack = '\n    at Page (page.tsx:3:9)\n    at Layout (root.tsx:8:2)'

		eventsRootOptions.onCaughtError(caught, { componentStack })

		eventsRootOptions.onUncaughtError(uncaught, { componentStack })

		eventsRootOptions.onRecoverableError(recoverable, {})

		expect(texts(store)).toEqual([
			'caught caught at Page (page.tsx:3:9)',
			'uncaught uncaught at Page (page.tsx:3:9)',
			'recoverable recoverable',
		])

		expect(store.entries.map(({ report }) => report?.origin)).toEqual([
			'caught',
			'uncaught',
			'recoverable',
		])

		expect(store.entries[0]?.report?.componentStack).toEqual([
			'at Page (page.tsx:3:9)',
			'at Layout (root.tsx:8:2)',
		])

		expect(consoleError).toHaveBeenCalledWith(caught)

		expect(report.mock.calls).toEqual([[uncaught], [recoverable]])
	})

	it('adds the window error of an uncaught error to the report of the root callback, with no new event', () => {
		const store = listenTo()

		vi.stubGlobal('reportError', vi.fn())

		const error = new Error('boom')

		eventsRootOptions.onUncaughtError(error, { componentStack: '\n    at Page (page.tsx:3:9)' })

		// `reportError` dispatches the `error` event of `window` with the same value.
		window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught Error: boom', error }))

		expect(texts(store)).toEqual(['uncaught boom at Page (page.tsx:3:9)'])

		expect(store.entries[0]?.report?.origin).toBe('uncaught')
	})
})

describe('start', () => {
	it('sets the attributes of the reports and of the capture, and clears them on halt', () => {
		onTestFinished(halt)

		const root = document.documentElement

		const store = start()

		expect(root.hasAttribute('data-events-reports')).toBe(false)

		reportBug(new Error('boom'))

		expect(root.hasAttribute('data-events-reports')).toBe(true)

		store.startCapture()

		expect(root.hasAttribute('data-events-capture')).toBe(true)

		halt()

		expect(root.hasAttribute('data-events-reports')).toBe(false)

		expect(root.hasAttribute('data-events-capture')).toBe(false)

		expect(getEventSink()).toBeUndefined()
	})

	it('returns the same store while it runs, and starts again with a separator after a halt', () => {
		onTestFinished(halt)

		const store = start()

		expect(start()).toBe(store)

		halt()

		expect(store.entries).toEqual([])

		expect(start()).toBe(store)

		expect(texts(store)[0]).toBe(`──── on ${location.pathname}`)
	})
})
