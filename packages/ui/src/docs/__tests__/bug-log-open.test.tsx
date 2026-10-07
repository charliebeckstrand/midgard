import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BugLogSheet } from '../debug/bug-log/sheet.tsx'
import { __resetDebugSheets, BugLogButton } from '../debug/event-log/index.tsx'
import { halt, startBugs } from '../debug/event-log/recorder.ts'

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

		fireEvent.click(screen.getByRole('button', { name: 'Back' }))

		expect(screen.getByRole('list', { name: 'Reports' })).toBeDefined()

		expect(screen.getByRole('checkbox', { name: 'Preserve' })).toBeDefined()
	})

	it('deletes a report, and shows an error report from the log', () => {
		render(<BugLogSheet open onOpenChange={() => {}} />)

		act(() => {
			window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
		})

		expect(startBugs().entries.map(({ title }) => title)).toEqual(['boom'])

		const list = screen.getByRole('list', { name: 'Reports' })

		expect(within(list).getByText('boom')).toBeDefined()

		act(() => {
			fireEvent.click(within(list).getByRole('button', { name: 'Delete' }))
		})

		expect(screen.getByText('No bugs')).toBeDefined()
	})
})
