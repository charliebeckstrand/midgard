import { act, fireEvent, render, screen } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetEventLogSheet, EventLogButton } from '../debug/event-log/index.tsx'
import { halt, record } from '../debug/event-log/recorder.ts'
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
})
