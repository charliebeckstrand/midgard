import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Listbox focus containment (real floating engine). Asserts that opening the
 * listbox pulls focus into the panel and keeps it contained: Tab dismisses the
 * surface and carries focus to the next tabbable (a select closes on Tab
 * rather than trapping like a dialog) and Escape / selection return focus to
 * the trigger. `FloatingFocusManager`'s guards and `closeOnFocusOut` don't
 * engage under jsdom (mocked).
 */

const panelSel = '[data-slot="popover-panel"]'

const findPanel = () =>
	waitFor(() => {
		const el = document.querySelector<HTMLElement>(panelSel)

		if (!el) throw new Error('panel not mounted')

		return el
	})

const isOpen = () => !!document.querySelector(panelSel)

describe('Listbox focus (real browser)', () => {
	it('moves focus to the selected option on open', async () => {
		renderUI(
			<Listbox aria-label="pick" value="b" displayValue={(v: string) => v}>
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		expect(document.activeElement?.getAttribute('data-selected')).toBe('true')
	})

	// Guards the APG select pattern: Tab dismisses the listbox and the keystroke
	// proceeds, landing focus on the next tabbable after the trigger — not
	// snapped back to the trigger, not stranded on `<body>`.
	it('dismisses the listbox on Tab and moves focus to the next tabbable', async () => {
		renderUI(
			<>
				<Listbox aria-label="pick">
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus())
	})

	it('returns focus to the trigger on Escape', async () => {
		renderUI(
			<Listbox aria-label="pick">
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		await findPanel()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveFocus())
	})

	it('returns focus to the trigger after selecting an option', async () => {
		renderUI(
			<Listbox aria-label="pick" displayValue={(v: string) => v}>
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		await findPanel()

		await userEvent.click(screen.getByRole('option', { name: 'A' }))

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveFocus())
	})
})
