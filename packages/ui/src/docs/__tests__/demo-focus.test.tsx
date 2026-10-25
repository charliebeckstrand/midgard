import { fireEvent, render, screen } from '@testing-library/react'
import { animate } from 'motion'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { it } from '../../__tests__/helpers/fake-clock'
import AlertClosable from '../pages/components/alert/closable.tsx'
import BannerClosable from '../pages/components/banner/closable.tsx'
import HoldButtonDestructive from '../pages/components/hold-button/destructive.tsx'
import PaginationPlayground from '../pages/components/pagination/playground.tsx'
import StepperWithContentPanels from '../pages/components/stepper/with-content-panels.tsx'
import TabsControlled from '../pages/components/tabs/controlled.tsx'
import TextareaWithActions from '../pages/components/textarea/with-actions.tsx'

// An example that removes, replaces, or disables the control that has the focus
// gives the focus to another control. Otherwise the focus falls to the body, and
// a keyboard user loses their place (WCAG 2.4.3).

// The hold button stub: the shared `animate` spy runs no animation under the
// fake clock (`hold-button.test.tsx`).
beforeEach(() => {
	vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)
})

afterEach(() => {
	vi.mocked(animate).mockRestore()
})

/** Focuses a button and clicks it, as a keyboard user does. */
function press(button: HTMLElement) {
	button.focus()

	fireEvent.click(button)
}

describe('demo focus', () => {
	it.each([
		['Alert', AlertClosable],
		['Banner', BannerClosable],
	])('moves the focus between the close button and Reset of the %s example', (_, Demo) => {
		render(<Demo />)

		press(screen.getByRole('button', { name: 'Dismiss' }))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset' }))

		press(screen.getByRole('button', { name: 'Reset' }))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dismiss' }))
	})

	it('moves the focus between the hold button and Reset', async ({ clock }) => {
		render(<HoldButtonDestructive />)

		const hold = screen.getByRole('button', { name: 'Hold to delete' })

		hold.focus()

		fireEvent.keyDown(hold, { key: 'Enter' })

		await clock.advance(1100)

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset' }))

		press(screen.getByRole('button', { name: 'Reset' }))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hold to delete' }))
	})

	it('moves the focus to the current page at the first and the last page', () => {
		render(<PaginationPlayground />)

		const next = screen.getByRole('button', { name: 'Next page' })

		for (let page = 1; page < 10; page++) press(next)

		expect(document.activeElement).toBe(screen.getByRole('button', { current: 'page' }))

		expect(document.activeElement?.textContent).toBe('10')

		const previous = screen.getByRole('button', { name: 'Previous page' })

		for (let page = 10; page > 1; page--) press(previous)

		expect(document.activeElement).toBe(screen.getByRole('button', { current: 'page' }))

		expect(document.activeElement?.textContent).toBe('1')
	})

	it.each([
		['Stepper', StepperWithContentPanels],
		['Tabs', TabsControlled],
	])('moves the focus between Back and Next at the ends of the %s example', (_, Demo) => {
		render(<Demo />)

		const back = screen.getByRole('button', { name: 'Back' })

		const next = screen.getByRole('button', { name: 'Next' })

		while (!next.hasAttribute('disabled')) press(next)

		expect(document.activeElement).toBe(back)

		while (!back.hasAttribute('disabled')) press(back)

		expect(document.activeElement).toBe(next)
	})

	it('moves the focus to the message when Send empties it', () => {
		render(<TextareaWithActions />)

		const message = screen.getByRole('textbox', { name: 'Message' })

		fireEvent.change(message, { target: { value: 'Hello' } })

		press(screen.getByRole('button', { name: 'Send' }))

		expect(document.activeElement).toBe(message)
	})
})
