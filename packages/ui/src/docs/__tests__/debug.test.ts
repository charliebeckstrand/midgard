import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { noStorage } from '../../__tests__/helpers/event-storage.ts'
import { listen } from '../../modules/events/engine/events-recorder.ts'
import { EventStore } from '../../modules/events/engine/events-store.ts'
import { componentEvent } from '../debug/component-events.ts'
import { routerEvents } from '../debug/router.ts'
import { DOCS_SOURCES } from '../debug/sources.ts'

/** Runs the sources of the module and of the docs into a new store, which the test stops when it ends. */
function listenTo(): EventStore {
	const store = new EventStore(noStorage)

	onTestFinished(listen(store, { sources: DOCS_SOURCES }))

	return store
}

/** Each event of a store as its kind and its text, with the scroll reading of the start out. */
function lines(store: EventStore): string[] {
	return store.entries
		.map(({ kind, text }) => `${kind} ${text}`)
		.filter((line) => !line.startsWith('load restore '))
}

describe('the sources of the docs', () => {
	afterEach(() => {
		delete window.__eventReadings
	})

	it('writes the scroll reading of the start, and takes the readings of the head script', () => {
		const stop = vi.fn()

		const early = { time: 1, kind: 'scroll', text: 'scroll before hydration', y: 30 }

		window.__eventReadings = { entries: [early], stop }

		const store = listenTo()

		expect(store.entries.map(({ text }) => text)).toEqual(
			expect.arrayContaining([expect.stringMatching(/^restore \w+ kept y \S+$/)]),
		)

		// A reading keeps its time, so it goes before the events of the start.
		expect(store.entries[0]).toMatchObject(early)

		expect(stop).toHaveBeenCalledOnce()

		expect(window.__eventReadings).toBeUndefined()
	})

	it('writes the scroll reading of a restore from the back-forward cache', () => {
		const store = listenTo()

		window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))

		expect(store.entries.filter(({ text }) => text.startsWith('restore '))).toHaveLength(2)
	})

	it('records the callbacks that a page gives to a component or a module, and stops with the store', () => {
		const store = new EventStore(noStorage)

		const stop = listen(store, { sources: DOCS_SOURCES })

		componentEvent('component', 'Tab', 'onPreload', vi.fn<(value: string) => void>())('Activity')

		componentEvent('module', 'Grid', 'onSortChange', vi.fn<(value: string) => void>())('name')

		stop()

		componentEvent('component', 'Tab', 'onPreload', vi.fn<(value: string) => void>())('Billing')

		expect(
			store.entries
				.filter(({ kind }) => kind !== 'load')
				.map(({ kind, name, text, detail }) => [kind, name, text, detail]),
		).toEqual([
			['component', 'Tab', 'onPreload("Activity")', ['Activity']],
			['module', 'Grid', 'onSortChange("name")', ['name']],
		])
	})

	it('batches the calls of one callback of one component while they come less than 150 ms apart', () => {
		vi.useFakeTimers()

		const store = listenTo()

		const onSortChange = componentEvent('module', 'Grid', 'onSortChange', vi.fn())

		const onPageChange = componentEvent('module', 'Grid', 'onPageChange', vi.fn())

		onSortChange('name')

		vi.advanceTimersByTime(100)

		onSortChange('age')

		onPageChange(2)

		vi.advanceTimersByTime(150)

		onSortChange('name')

		const [a, b, page, c] = store.entries
			.filter(({ kind }) => kind === 'module')
			.map(({ batch }) => batch)

		expect(b).toBe(a)

		expect(new Set([a, page, c]).size).toBe(3)
	})
})

describe('routerEvents', () => {
	const context = (fields: object = {}) =>
		({ location: { pathname: '/a' }, params: {}, pattern: '/:page', ...fields }) as Parameters<
			typeof routerEvents.onError
		>[1]

	it('records a response under 500 that a route throws as an event, not a bug', () => {
		const store = listenTo()

		// The shape that `isRouteErrorResponse` reads.
		const response = { status: 404, statusText: 'Not Found', internal: false, data: null }

		routerEvents.onError(response, context())

		expect(lines(store)).toEqual(['route response 404 /:page'])

		expect(store.entries.some(({ report }) => report)).toBe(false)
	})

	it('files a bug for an error of a route, with the route pattern and the component stack', () => {
		const store = listenTo()

		routerEvents.onError(
			new Error('loader fails'),
			context({ errorInfo: { componentStack: '\n    at Page (page.tsx:3:9)' } }),
		)

		expect(lines(store)).toEqual(['error route loader fails at Page (page.tsx:3:9)'])

		expect(store.entries.at(-1)?.report).toMatchObject({
			origin: 'route',
			route: '/:page',
			componentStack: ['at Page (page.tsx:3:9)'],
		})
	})

	it('writes the start and the end of each navigation, with its pattern and its time', async () => {
		const store = listenTo()

		type Instrument = {
			navigate: (handler: () => Promise<unknown>, info: { to: string }) => Promise<void>
		}

		let instrument: Instrument | undefined

		for (const instrumentation of routerEvents.instrumentations)
			instrumentation.router?.({
				instrument: (next: Instrument) => {
					instrument = next
				},
			} as never)

		await instrument?.navigate(async () => ({ status: 'success', meta: { pattern: '/:page' } }), {
			to: '/a',
		})

		await instrument?.navigate(async () => ({ status: 'error', meta: { pattern: '/:page' } }), {
			to: '/b',
		})

		expect(lines(store)).toEqual([
			'route navigate /a',
			expect.stringMatching(/^route navigated \/:page \d+ ms$/),
			'route navigate /b',
			expect.stringMatching(/^route navigate fails \/:page \d+ ms$/),
		])
	})
})
