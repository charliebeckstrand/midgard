import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EventLogButton } from '../debug/event-log/index.tsx'
import { halt } from '../debug/event-log/recorder.ts'

// A sheet that suspends opens late, because React holds the content back for
// at least 300 ms. So the button opens the sheet only when its module is
// loaded, and a loaded sheet opens in the frame of the click.

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
