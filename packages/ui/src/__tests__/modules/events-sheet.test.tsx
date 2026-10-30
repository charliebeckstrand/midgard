import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, onTestFinished, vi } from 'vitest'
import { halt, start } from '../../modules/events/engine/events-recorder'
import {
	isEventsPinned,
	setEventsOn,
	setEventsPinned,
} from '../../modules/events/engine/events-setting'
import { getEventSink, recordEvent, reportBug } from '../../modules/events/engine/events-sink'
import { EventsAside } from '../../modules/events/events-aside'
import { EventsButton } from '../../modules/events/events-button'
import { loadTools } from '../../modules/events/events-load'
import { EventsPanel } from '../../modules/events/events-panel'
import { EventsSheet } from '../../modules/events/events-sheet'
import { EventsSwitch } from '../../modules/events/events-switch'
import { LocaleProvider } from '../../providers/locale'
import { createLazyModule } from '../../utilities/lazy-module'
import { deferred, stubClipboard } from '../helpers'
import { it } from '../helpers/fake-clock'

// The sheet starts the recorder, which listens on the document. The halt
// drops the events and ends a capture. This hook runs before the `cleanup` of
// the setup, so the tree is still mounted, and the two calls update it.
afterEach(() => {
	act(() => {
		halt()

		setEventsPinned(false)
	})
})

/**
 * Removes the stored events setting and the root attribute when the test
 * finishes, so a test that turns the events on leaves them off.
 */
function restoreEventsOn() {
	onTestFinished(() => {
		localStorage.removeItem('events:on')

		document.documentElement.removeAttribute('data-events')
	})
}

/** Replaces the clipboard for the test, and returns its `writeText`. */
function mockClipboard() {
	const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()

	stubClipboard({ writeText })

	return writeText
}

/** A closed sheet, which opens with a rerender. */
function renderSheet() {
	const sheet = (open: boolean) => <EventsSheet open={open} onOpenChange={() => undefined} />

	const result = render(sheet(false))

	return {
		...result,
		open: () => result.rerender(sheet(true)),
		close: () => result.rerender(sheet(false)),
	}
}

describe('EventsButton', () => {
	it('opens the sheet, and opens the loaded sheet in the commit of the click', async () => {
		render(<EventsButton />)

		const trigger = screen.getByRole('button', { name: 'Events' })

		// The first press loads the sheet.
		fireEvent.click(trigger)

		const close = await screen.findByRole('button', { name: 'Close' })

		act(() => {
			fireEvent.click(close)
		})

		act(() => {
			fireEvent.click(trigger)
		})

		expect(screen.getByRole('tab', { name: 'Events', selected: true })).toBeDefined()
	})

	it('stamps aria-expanded and data-open on the trigger while the sheet is open', async () => {
		render(<EventsButton />)

		const trigger = screen.getByRole('button', { name: 'Events' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(trigger).not.toHaveAttribute('data-open')

		fireEvent.click(trigger)

		const close = await screen.findByRole('button', { name: 'Close' })

		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		expect(trigger).toHaveAttribute('data-open')

		act(() => {
			fireEvent.click(close)
		})

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(trigger).not.toHaveAttribute('data-open')
	})

	it('pauses the store from the press, so the store does not record the load of its own sheet', async () => {
		const store = start()

		render(<EventsButton />)

		fireEvent.click(screen.getByRole('button', { name: 'Events' }))

		await vi.waitFor(() => expect(store.paused).toBe(true))

		recordEvent('route', '/during-load')

		const close = await screen.findByRole('button', { name: 'Close' })

		act(() => {
			fireEvent.click(close)
		})

		expect(store.paused).toBe(false)

		recordEvent('route', '/after-close')

		expect(store.entries.map(({ text }) => text)).not.toContain('/during-load')

		expect(store.entries.at(-1)?.text).toBe('/after-close')
	})
})

describe('loadTools', () => {
	it('pauses the store while a preload loads, and ends the pause when the load ends', async () => {
		const store = start()

		const load = deferred<object>()

		const preload = loadTools(
			createLazyModule(() => load.promise),
			false,
		)

		expect(store.paused).toBe(true)

		load.resolve({})

		await preload

		expect(store.paused).toBe(false)
	})

	it('keeps the pause of a press that shares the load of a preload', async () => {
		const store = start()

		onTestFinished(() => store.setPaused(false))

		const load = deferred<object>()

		const module = createLazyModule(() => load.promise)

		// The hover starts the load, and the press comes before it ends.
		const preload = loadTools(module, false)

		const press = loadTools(module, true)

		load.resolve({})

		await Promise.all([preload, press])

		expect(store.paused).toBe(true)
	})
})

describe('EventsSheet', () => {
	it('shows Clear only while the store holds an event', async () => {
		start().clear()

		const sheet = renderSheet()

		sheet.open()

		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

		sheet.close()

		recordEvent('route', '/to-clear')

		sheet.open()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
		})

		// The view renders the change of the store in the next frame.
		expect(await screen.findByText('No events')).toBeDefined()

		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
	})

	it('does not leave the store paused when it unmounts while it is open', () => {
		const { unmount } = render(<EventsSheet open onOpenChange={() => undefined} />)

		expect(start().paused).toBe(true)

		unmount()

		recordEvent('route', '/after-unmount')

		expect(start().entries.at(-1)?.text).toBe('/after-unmount')
	})

	it('does not render for a new event while it is closed, and shows the event when it opens', () => {
		let commits = 0

		const sheet = (open: boolean) => (
			<Profiler id="sheet" onRender={() => commits++}>
				<EventsSheet open={open} onOpenChange={() => undefined} />
			</Profiler>
		)

		const { rerender } = render(sheet(false))

		const before = commits

		act(() => recordEvent('route', '/closed'))

		expect(commits).toBe(before)

		rerender(sheet(true))

		expect(screen.getByText('/closed')).toBeDefined()
	})

	it('opens the detail of a line in a tree on a click on its text, and copies the detail as JSON under its line', async () => {
		const writeText = mockClipboard()

		const sheet = renderSheet()

		recordEvent('sync', 'sync ends', { rows: 3 })

		recordEvent('route', '/plain')

		sheet.open()

		// Only the line with a detail has a toggle. The toggle holds the text of
		// the line, so a click on the text opens the detail.
		const detailed = within(screen.getByText('sync ends').closest('li') ?? document.body)

		const plain = within(screen.getByText('/plain').closest('li') ?? document.body)

		expect(plain.queryByRole('button')).toBeNull()

		fireEvent.click(detailed.getByText('sync ends'))

		expect(detailed.getByRole('tree', { name: 'Details' })).toBeDefined()

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
		})

		const lines = (writeText.mock.calls[0]?.[0] ?? '').split('\n')

		const index = lines.findIndex((line) => line.endsWith('sync ends'))

		const indent = ' '.repeat(lines[index]?.indexOf('sync ends') ?? 0)

		expect(lines.slice(index + 1, index + 4)).toEqual([
			`${indent}{`,
			`${indent}  "rows": 3`,
			`${indent}}`,
		])

		expect(lines[index + 4]).toMatch(/\/plain$/)
	})

	it('shows a batch as one line, which opens to its lines, and each event as its own line with "Batch" off', async ({
		clock,
	}) => {
		const store = start()

		onTestFinished(() => {
			store.setBatched(true)
		})

		const sheet = renderSheet()

		document.dispatchEvent(new Event('scroll'))

		await clock.advance(150)

		sheet.open()

		const summary = screen.getByText(/^scroll starts page … scroll ends \(2 lines, \d+ ms\)$/)

		expect(screen.queryByText('scroll ends')).toBeNull()

		fireEvent.click(summary)

		expect(screen.getByText('scroll ends')).toBeDefined()

		fireEvent.click(screen.getByRole('checkbox', { name: 'Batch' }))

		expect(store.batched).toBe(false)

		// The view renders the change in the next frame. The open batch already
		// shows its lines, so the test waits for the summary to go.
		await waitFor(() => expect(screen.queryByText(/\(2 lines,/)).toBeNull())

		expect(screen.getByText('scroll starts page')).toBeDefined()
	})
})

describe('EventsSheet Bugs', () => {
	it('shows a bug in the Bugs tab with its count, and opens its report from the row in the Events tab', () => {
		const sheet = renderSheet()

		reportBug(new Error('boom'))

		sheet.open()

		expect(screen.getByRole('tab', { name: 'Bugs 1' })).toBeDefined()

		fireEvent.click(screen.getByText('caught boom'))

		const hash = start().entries.find(({ report }) => report)?.report?.hash ?? ''

		expect(hash).toMatch(/^[0-9a-f]{7}$/)

		// The crumbs name the report, and the table of the report holds the hash too.
		const crumbs = screen.getByRole('navigation')

		expect(within(crumbs).getByText(hash).closest('[aria-current="page"]')).not.toBeNull()

		expect(screen.getByRole('heading', { name: 'caught boom' })).toBeDefined()

		// The footer holds the actions of the report, not of the list.
		expect(screen.queryByRole('button', { name: 'Capture' })).toBeNull()

		fireEvent.click(within(crumbs).getByRole('link', { name: 'Bugs' }))

		expect(screen.getByRole('list', { name: 'Bugs' })).toBeDefined()
	})

	it('copies the report on view, and its Delete goes back to the list and keeps the event', async () => {
		const writeText = mockClipboard()

		const sheet = renderSheet()

		reportBug(new Error('boom'))

		reportBug(new Error('bang'))

		sheet.open()

		fireEvent.click(screen.getByRole('tab', { name: 'Bugs 2' }))

		const list = screen.getByRole('list', { name: 'Bugs' })

		fireEvent.click(
			within(within(list).getByText('caught boom').closest('li') ?? list).getByRole('button', {
				name: 'View',
			}),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
		})

		const text = writeText.mock.calls[0]?.[0] ?? ''

		expect(text).toMatch(/^## caught boom\n/)

		expect(text).not.toContain('bang')

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		})

		expect(screen.getByRole('list', { name: 'Bugs' })).toBeDefined()

		expect(
			start()
				.entries.filter(({ report }) => report)
				.map(({ text: line }) => line),
		).toEqual(['caught bang'])

		expect(start().entries.map(({ text: line }) => line)).toContain('caught boom')
	})

	it('opens on the list after a close from the report view', () => {
		const sheet = renderSheet()

		reportBug(new Error('boom'))

		sheet.open()

		fireEvent.click(screen.getByText('caught boom'))

		expect(screen.getByRole('heading', { name: 'caught boom' })).toBeDefined()

		sheet.close()

		sheet.open()

		expect(screen.queryByRole('heading', { name: 'caught boom' })).toBeNull()

		expect(screen.getByRole('list', { name: 'Bugs' })).toBeDefined()
	})

	it('runs a capture until Stop, then shows its report with each event from its start', async () => {
		const store = start()

		const sheet = renderSheet()

		sheet.open()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		expect(store.capturing).toBe(true)

		// "Preserve" is on while a capture runs.
		expect(await screen.findByRole('checkbox', { name: 'Preserve', checked: true })).toHaveProperty(
			'disabled',
			true,
		)

		// The store records nothing while the sheet is open, so the steps of the bug come after a close.
		sheet.close()

		recordEvent('route', '/during-capture')

		sheet.open()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Stop capture' }))
		})

		expect(store.capturing).toBe(false)

		expect(await screen.findByRole('heading', { name: 'capture' })).toBeDefined()

		const report = store.entries.find(({ report: item }) => item?.origin === 'capture')?.report

		expect(report?.trail).toEqual([
			expect.stringContaining('capture starts'),
			expect.stringContaining('/during-capture'),
		])
	})
})

describe('pin', () => {
	it('pins the view from the sheet, and the panel unpins it', async () => {
		// The attribute of the pin follows the pin only while the events run.
		localStorage.setItem('events:on', '1')

		restoreEventsOn()

		const onOpenChange = vi.fn()

		// The aside is the place of the pinned view, so the sheet shows Pin while one is mounted.
		render(
			<>
				<EventsAside />
				<EventsSheet open onOpenChange={onOpenChange} />
			</>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Pin' }))

		expect(isEventsPinned()).toBe(true)

		expect(document.documentElement.hasAttribute('data-events-pinned')).toBe(true)

		expect(onOpenChange).toHaveBeenCalledWith(false)

		// The aside mounts the panel of the pin.
		fireEvent.click(await screen.findByRole('button', { name: 'Unpin' }))

		expect(isEventsPinned()).toBe(false)

		expect(document.documentElement.hasAttribute('data-events-pinned')).toBe(false)
	})

	it('does not show Pin on a page with no pinned panel, and shows it when a panel mounts', () => {
		render(<EventsSheet open onOpenChange={() => undefined} />)

		expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull()

		const aside = render(<EventsAside />)

		expect(screen.getByRole('button', { name: 'Pin' })).toBeDefined()

		aside.unmount()

		expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull()
	})

	it('does not load the panel or start the recorder for a pin while the events are off', async () => {
		setEventsPinned(true)

		render(<EventsAside />)

		// The load of the panel, when one starts, resolves in this wait.
		await act(() => import('../../modules/events/events-panel'))

		expect(screen.queryByRole('button', { name: 'Unpin' })).toBeNull()

		expect(getEventSink()).toBeUndefined()
	})

	it('mounts the pinned panel when the events turn on, and unmounts it when they turn off', async () => {
		restoreEventsOn()

		setEventsPinned(true)

		render(<EventsAside />)

		act(() => setEventsOn(true))

		expect(await screen.findByRole('button', { name: 'Unpin' })).toBeDefined()

		act(() => setEventsOn(false))

		expect(screen.queryByRole('button', { name: 'Unpin' })).toBeNull()
	})

	it('shows each new event in the panel, and does not pause the store', async () => {
		const store = start()

		render(<EventsPanel />)

		expect(store.paused).toBe(false)

		act(() => recordEvent('route', '/live'))

		expect(await screen.findByText('/live')).toBeDefined()
	})

	it('scrolls its list in the body, so the list renders a window of the rows', async () => {
		start()

		render(<EventsPanel />)

		act(() => {
			for (let index = 0; index < 40; index++) recordEvent('route', `/page-${index}`)
		})

		const list = await screen.findByRole('list', { name: 'Events' })

		// The body is the scroll region of the list. With no region, the list
		// renders each of the rows on each new event.
		expect(within(list).getAllByRole('listitem').length).toBeLessThan(40)
	})
})

describe('EventsSwitch', () => {
	it('turns the events on and off, and the root attribute follows it', () => {
		restoreEventsOn()

		render(<EventsSwitch />)

		const toggle = screen.getByRole('switch', { name: 'Debug' })

		expect(toggle).not.toBeChecked()

		fireEvent.click(toggle)

		expect(toggle).toBeChecked()

		expect(localStorage.getItem('events:on')).toBe('1')

		expect(document.documentElement.hasAttribute('data-events')).toBe(true)

		fireEvent.click(toggle)

		expect(localStorage.getItem('events:on')).toBeNull()

		expect(document.documentElement.hasAttribute('data-events')).toBe(false)
	})
})

describe('EventsSheet in a locale', () => {
	it('names its controls in the language of the locale, and keeps the report in English', async () => {
		const sheet = (open: boolean) => (
			<LocaleProvider locale="es-ES">
				<EventsSheet open={open} onOpenChange={() => undefined} />
			</LocaleProvider>
		)

		const result = render(sheet(false))

		reportBug(new Error('boom'))

		result.rerender(sheet(true))

		expect(screen.getByRole('tab', { name: 'Errores 1' })).toBeDefined()

		expect(screen.getByRole('button', { name: 'Capturar' })).toBeDefined()

		// The line of the event is developer data, so it stays as the store wrote it.
		fireEvent.click(screen.getByText('caught boom'))

		const crumbs = screen.getByRole('navigation', { name: 'Ruta de navegación' })

		expect(within(crumbs).getByRole('link', { name: 'Errores' })).toBeDefined()

		expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDefined()

		// The code blocks of the report highlight after they mount.
		await waitFor(() => {
			for (const block of document.querySelectorAll('[data-slot="code-block"]')) {
				expect(block.querySelector('pre.shiki')).not.toBeNull()
			}
		})
	})
})
