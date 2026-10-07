import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { BugLogSheet } from '../debug/bug-log/sheet.tsx'
import { __resetDebugSheets, BugLogButton } from '../debug/index.tsx'
import { halt, start } from '../debug/recorder.ts'

// The button keeps the loaded sheets, so each case starts with no sheet.
beforeEach(__resetDebugSheets)

// The sheet starts the recorder, which listens on the document. The stop empties the Bug log.
afterEach(() => {
	halt()

	document.documentElement.removeAttribute('data-debug')
})

describe('BugLogButton', () => {
	it('opens the Bug log sheet', async () => {
		render(<BugLogButton />)

		fireEvent.click(screen.getByRole('button', { name: 'Bugs' }))

		expect(await screen.findByRole('heading', { name: 'Bugs' })).toBeDefined()
	})
})

describe('BugLogSheet', () => {
	it('shows Clear only while the log holds a report, and no Copy all', () => {
		render(<BugLogSheet open onOpenChange={() => {}} />)

		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		expect(screen.queryByRole('button', { name: /^Copy all$/ })).toBeNull()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
		})

		expect(screen.getByText('No bugs')).toBeDefined()

		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
	})

	it('shows a report in place of the list and of "Preserve", and goes back', () => {
		render(<BugLogSheet open onOpenChange={() => {}} />)

		expect(screen.getByText('No bugs')).toBeDefined()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		const list = screen.getByRole('list', { name: 'Reports' })

		expect(within(list).getByText('capture')).toBeDefined()

		fireEvent.click(within(list).getByRole('button', { name: 'View' }))

		expect(screen.getByRole('heading', { name: 'capture' })).toBeDefined()

		expect(screen.queryByRole('checkbox', { name: 'Preserve' })).toBeNull()

		// The footer holds the actions of the report, not of the list.
		expect(screen.queryByRole('button', { name: 'Capture' })).toBeNull()

		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

		expect(screen.getByRole('button', { name: 'Copy' })).toBeDefined()

		fireEvent.click(screen.getByRole('link', { name: 'Bugs' }))

		expect(screen.getByRole('list', { name: 'Reports' })).toBeDefined()

		expect(screen.getByRole('checkbox', { name: 'Preserve' })).toBeDefined()
	})

	it('copies the report on view, and its Delete goes back to the list', async () => {
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

		render(<BugLogSheet open onOpenChange={() => {}} />)

		act(() => {
			window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))

			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		const list = screen.getByRole('list', { name: 'Reports' })

		fireEvent.click(
			within(within(list).getByText('boom').closest('li') ?? list).getByRole('button', {
				name: 'View',
			}),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
		})

		const text = writeText.mock.calls[0]?.[0] ?? ''

		expect(text).toMatch(/^## boom\n/)

		expect(text).not.toContain('## capture')

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		})

		expect(start().bugs.entries.map(({ title }) => title)).toEqual(['capture'])

		expect(screen.getByRole('list', { name: 'Reports' })).toBeDefined()
	})

	it('opens a report on a press on its row, with the crumbs of its hash, and shows the hash in the list', () => {
		render(<BugLogSheet open onOpenChange={() => {}} />)

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		const [report] = start().bugs.entries

		const hash = report?.hash ?? ''

		expect(hash).toMatch(/^[0-9a-f]{7}$/)

		const list = screen.getByRole('list', { name: 'Reports' })

		fireEvent.click(within(list).getByText(hash))

		expect(screen.getByRole('heading', { name: 'capture' })).toBeDefined()

		const crumbs = screen.getByRole('navigation')

		expect(within(crumbs).getByText(hash).closest('[aria-current="page"]')).not.toBeNull()

		// The table of the report holds the hash too.
		expect(screen.getAllByText(hash)).toHaveLength(2)
	})

	it('opens on the list after a close from the report view, and after a Delete there', () => {
		const sheet = (open: boolean) => <BugLogSheet open={open} onOpenChange={() => {}} />

		const { rerender } = render(sheet(true))

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		fireEvent.click(screen.getByRole('button', { name: 'View' }))

		expect(screen.getByRole('heading', { name: 'capture' })).toBeDefined()

		rerender(sheet(false))

		rerender(sheet(true))

		expect(screen.getByRole('list', { name: 'Reports' })).toBeDefined()

		fireEvent.click(screen.getByRole('button', { name: 'View' }))

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		})

		// The new report takes the id of the report that went out.
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
		})

		expect(screen.getByRole('list', { name: 'Reports' })).toBeDefined()

		expect(screen.queryByRole('heading', { name: 'capture' })).toBeNull()
	})

	it('deletes a report, and shows an error report from the log', () => {
		render(<BugLogSheet open onOpenChange={() => {}} />)

		act(() => {
			window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
		})

		expect(start().bugs.entries.map(({ title }) => title)).toEqual(['boom'])

		const list = screen.getByRole('list', { name: 'Reports' })

		expect(within(list).getByText('boom')).toBeDefined()

		act(() => {
			fireEvent.click(within(list).getByRole('button', { name: 'Delete' }))
		})

		expect(screen.getByText('No bugs')).toBeDefined()
	})
})
