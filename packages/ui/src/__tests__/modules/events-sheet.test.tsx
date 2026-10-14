import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { halt, start } from '../../modules/events/engine/events-recorder'
import { isEventsPinned, setEventsPinned } from '../../modules/events/engine/events-setting'
import { recordEvent, reportBug } from '../../modules/events/engine/events-sink'
import { EventsButton } from '../../modules/events/events-button'
import { EventsPanel } from '../../modules/events/events-panel'
import { EventsSheet } from '../../modules/events/events-sheet'

// The sheet starts the recorder, which listens on the document. The halt
// drops the events and ends a capture.
afterEach(() => {
	halt()

	setEventsPinned(false)
})

/** Replaces the clipboard for the test, and returns its `writeText`. */
function mockClipboard() {
	const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()

	const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

	Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } })

	onTestFinished(() => {
		if (original) Object.defineProperty(window.navigator, 'clipboard', original)
		else delete (window.navigator as { clipboard?: unknown }).clipboard
	})

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

	it('shows a batch as one line, which opens to its lines, and each event as its own line with "Batch" off', async () => {
		const store = start()

		onTestFinished(() => {
			store.batched = true
		})

		const sheet = renderSheet()

		vi.useFakeTimers()

		onTestFinished(() => {
			vi.useRealTimers()
		})

		document.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(150)

		vi.useRealTimers()

		sheet.open()

		const summary = screen.getByText(/^scroll starts page … scroll ends \(2 lines, \d+ ms\)$/)

		expect(screen.queryByText('scroll ends')).toBeNull()

		fireEvent.click(summary)

		expect(screen.getByText('scroll ends')).toBeDefined()

		fireEvent.click(screen.getByRole('checkbox', { name: 'Batch' }))

		expect(store.batched).toBe(false)

		expect(await screen.findByText('scroll starts page')).toBeDefined()

		expect(screen.queryByText(/\(2 lines,/)).toBeNull()
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
			fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
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
	it('pins the view from the sheet, and the panel unpins it', () => {
		// The attribute of the pin follows the pin only while the events run.
		localStorage.setItem('events:on', '1')

		onTestFinished(() => {
			localStorage.removeItem('events:on')

			document.documentElement.removeAttribute('data-events')
		})

		const onOpenChange = vi.fn()

		render(<EventsSheet open onOpenChange={onOpenChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Pin' }))

		expect(isEventsPinned()).toBe(true)

		expect(document.documentElement.hasAttribute('data-events-pinned')).toBe(true)

		expect(onOpenChange).toHaveBeenCalledWith(false)

		render(<EventsPanel />)

		fireEvent.click(screen.getByRole('button', { name: 'Unpin' }))

		expect(isEventsPinned()).toBe(false)

		expect(document.documentElement.hasAttribute('data-events-pinned')).toBe(false)
	})

	it('shows each new event in the panel, and does not pause the store', async () => {
		const store = start()

		render(<EventsPanel />)

		expect(store.paused).toBe(false)

		act(() => recordEvent('route', '/live'))

		expect(await screen.findByText('/live')).toBeDefined()
	})
})
