import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { componentEvent } from '../debug/event-log/component-events.ts'
import { __resetEventLogSheet, EventLogButton } from '../debug/event-log/index.tsx'
import { halt, record, start } from '../debug/event-log/recorder.ts'
import { EventLogSheet } from '../debug/event-log/sheet.tsx'

// A sheet that suspends opens late, because React holds the content back for
// at least 300 ms. So the button opens the sheet only when its module is
// loaded, and a loaded sheet opens in the frame of the click.

// The button keeps the loaded sheet module, so each case starts with no sheet.
beforeEach(__resetEventLogSheet)

// The sheet starts the recorder, which listens on the document.
afterEach(() => {
	halt()

	document.documentElement.removeAttribute('data-debug')
})

describe('EventLogButton', () => {
	it('opens the loaded sheet in the commit of the click', async () => {
		document.documentElement.setAttribute('data-debug', '')

		render(<EventLogButton />)

		const trigger = screen.getByRole('button', { name: 'Event log' })

		// A pointer on the button loads the sheet.
		await act(async () => {
			fireEvent.pointerEnter(trigger)

			await import('../debug/event-log/sheet.tsx')
		})

		act(() => {
			fireEvent.click(trigger)
		})

		expect(screen.getByRole('heading', { name: 'Event log' })).toBeDefined()
	})

	it('opens the sheet when its module loads', async () => {
		render(<EventLogButton />)

		fireEvent.click(screen.getByRole('button', { name: 'Event log' }))

		expect(await screen.findByRole('heading', { name: 'Event log' })).toBeDefined()
	})
})

describe('EventLogSheet', () => {
	it('does not leave the log paused when it unmounts while it is open', () => {
		const { unmount } = render(<EventLogSheet open onOpenChange={() => {}} />)

		unmount()

		record('route', '/after-unmount')

		expect(start().entries.at(-1)?.text).toBe('/after-unmount')
	})

	it('does not render for a new entry while it is closed, and shows the entry when it opens', () => {
		let commits = 0

		const sheet = (open: boolean) => (
			<Profiler id="sheet" onRender={() => commits++}>
				<EventLogSheet open={open} onOpenChange={() => {}} />
			</Profiler>
		)

		const { rerender } = render(sheet(false))

		const before = commits

		act(() => record('route', '/closed'))

		expect(commits).toBe(before)

		rerender(sheet(true))

		expect(screen.getByText('/closed')).toBeDefined()
	})

	it('opens the detail of a line in a tree on a click on its text, and copies the detail as JSON under its line', async () => {
		const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()

		const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		})

		onTestFinished(() => {
			if (original) Object.defineProperty(window.navigator, 'clipboard', original)
			else delete (window.navigator as { clipboard?: unknown }).clipboard
		})

		const { rerender } = render(<EventLogSheet open={false} onOpenChange={() => {}} />)

		act(() => {
			record('error', 'boom', { stack: ['at f (a.js:1:2)'] })

			record('route', '/plain')

			componentEvent('component', 'Tabs', 'onValueChange', (_value: string) => {})('Payment')
		})

		rerender(<EventLogSheet open onOpenChange={() => {}} />)

		// Only the line with a detail has a toggle. The toggle holds the text of
		// the line, so a click on the text opens the detail.
		const error = within(screen.getByText('boom').closest('li') ?? document.body)

		const plain = within(screen.getByText('/plain').closest('li') ?? document.body)

		expect(plain.queryByRole('button')).toBeNull()

		fireEvent.click(error.getByText('boom'))

		expect(error.getByRole('tree', { name: 'Details' })).toBeDefined()

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
		})

		const text = writeText.mock.calls[0]?.[0] ?? ''

		const lines = text.split('\n')

		const at = lines.findIndex((line) => line.endsWith('boom'))

		const indent = ' '.repeat(lines[at]?.indexOf('boom') ?? 0)

		expect(lines.slice(at + 1, at + 6)).toEqual([
			`${indent}{`,
			`${indent}  "stack": [`,
			`${indent}    "at f (a.js:1:2)"`,
			`${indent}  ]`,
			`${indent}}`,
		])

		expect(lines[at + 6]).toMatch(/\/plain$/)

		// A component line shows the component in the kind column, and the prop and the arguments as its text.
		expect(lines[at + 7]).toMatch(/ y\d+\s+Tabs\s+onValueChange\("Payment"\)$/)
	})
})

describe('EventLogSheet Batch', () => {
	it('shows a batch as one line that opens to its lines, and copies its lines under the summary', async () => {
		// The sheet starts the same log.
		const log = start()

		const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()

		const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		})

		onTestFinished(() => {
			if (original) Object.defineProperty(window.navigator, 'clipboard', original)
			else delete (window.navigator as { clipboard?: unknown }).clipboard

			log.batched = false
		})

		const { rerender } = render(<EventLogSheet open={false} onOpenChange={() => {}} />)

		act(() => {
			const onValueChange = componentEvent('component', 'Tabs', 'onValueChange', vi.fn())

			onValueChange('Payment')

			onValueChange('Billing')
		})

		rerender(<EventLogSheet open onOpenChange={() => {}} />)

		expect(screen.getByText('onValueChange("Payment")')).toBeDefined()

		fireEvent.click(screen.getByRole('checkbox', { name: 'Batch' }))

		const summary = screen.getByText(
			/^onValueChange\("Payment"\) … onValueChange\("Billing"\) \(2 lines, \d+ ms\)$/,
		)

		expect(screen.queryByText('onValueChange("Billing")')).toBeNull()

		fireEvent.click(summary)

		expect(screen.getByText('onValueChange("Billing")')).toBeDefined()

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
		})

		const lines = (writeText.mock.calls[0]?.[0] ?? '').split('\n')

		const at = lines.findIndex((line) => line.includes('(2 lines,'))

		expect(lines[at + 1]).toMatch(/^ {2}\s*\d+ y\d+\s+Tabs\s+onValueChange\("Payment"\)$/)
	})
})

describe('EventLogSheet type filter', () => {
	it('shows each type with no selected type, and only the selected types after a selection', () => {
		const { rerender } = render(<EventLogSheet open={false} onOpenChange={() => {}} />)

		act(() => {
			record('route', '/filtered')

			record('error', 'filtered error')
		})

		rerender(<EventLogSheet open onOpenChange={() => {}} />)

		const types = screen.getByRole('combobox', { name: 'Types' })

		expect(types.textContent).toContain('All types')

		expect(screen.getByText('/filtered')).toBeDefined()

		expect(screen.getByText('filtered error')).toBeDefined()

		fireEvent.click(types)

		fireEvent.click(screen.getByRole('option', { name: 'route' }))

		expect(screen.getByText('/filtered')).toBeDefined()

		expect(screen.queryByText('filtered error')).toBeNull()

		fireEvent.click(screen.getByRole('option', { name: 'hmr' }))

		fireEvent.click(screen.getByRole('option', { name: 'route' }))

		expect(screen.queryByText('/filtered')).toBeNull()

		expect(screen.getByText('No events of the selected types')).toBeDefined()

		// With no selected type, the sheet shows each type again.
		fireEvent.click(screen.getByRole('option', { name: 'hmr' }))

		expect(screen.getByText('/filtered')).toBeDefined()

		expect(screen.getByText('filtered error')).toBeDefined()
	})
})

describe('the recorder', () => {
	it('drops the lines and the kept copy when the log turns off, and starts again with a separator', () => {
		const log = start()

		log.preserve = true

		onTestFinished(() => {
			log.preserve = false
		})

		record('route', '/before')

		log.save()

		halt()

		expect(log.entries).toEqual([])

		expect(JSON.parse(sessionStorage.getItem('docs:event-log:entries') ?? '[]')).toEqual([])

		// The log takes no line while it is off.
		record('route', '/off')

		expect(log.entries).toEqual([])

		expect(start()).toBe(log)

		record('route', '/after')

		expect(log.entries.map(({ text }) => text)).toEqual([
			`──── on ${location.pathname}`,
			expect.stringMatching(/^restore /),
			'/after',
		])
	})
})
