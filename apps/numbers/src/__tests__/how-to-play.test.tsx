// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it } from 'vitest'
import { HowToPlay } from '../components/how-to-play'

afterEach(cleanup)

/** Opens the dialog from its button, and gives the dialog. */
async function openDialog() {
	render(
		<UIProvider>
			<HowToPlay />
		</UIProvider>,
	)

	expect(screen.queryByRole('dialog')).toBeNull()

	fireEvent.click(screen.getByRole('button', { name: 'How to play' }))

	return screen.findByRole('dialog', { name: 'How to play' })
}

/** Whether the section of `name` in `dialog` is open. */
const isOpen = (dialog: HTMLElement, name: string) =>
	within(dialog).getByRole('button', { name }).getAttribute('aria-expanded') === 'true'

describe('HowToPlay', () => {
	it('opens on the Rules section, with Vs CPU and Daily puzzle closed', async () => {
		const dialog = await openDialog()

		expect(isOpen(dialog, 'Rules')).toBe(true)

		expect(isOpen(dialog, 'Vs CPU')).toBe(false)

		expect(isOpen(dialog, 'Daily puzzle')).toBe(false)

		expect(dialog.textContent).toContain('Each run draws 20 numbers between 1 and 1000')
	})

	it('keeps one section open at a time', async () => {
		const dialog = await openDialog()

		fireEvent.click(within(dialog).getByRole('button', { name: 'Vs CPU' }))

		expect(isOpen(dialog, 'Vs CPU')).toBe(true)

		expect(isOpen(dialog, 'Rules')).toBe(false)
	})
})
