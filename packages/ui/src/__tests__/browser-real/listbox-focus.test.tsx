import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { Listbox } from '../../components/listbox'
import { ListboxOption } from '../../components/listbox/listbox-option'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Listbox focus containment (real floating engine). jsdom mocks
 * `@floating-ui/react` away, so `FloatingFocusManager`'s guards and
 * `closeOnFocusOut` never engage there — the behaviour this suite guards is
 * invisible under jsdom. With the engine real, opening the listbox must pull
 * focus into the panel and keep it contained: Tab dismisses the surface (a
 * select closes on Tab rather than trapping like a dialog) instead of walking
 * the page with the panel left open behind it, and Escape / selection hand
 * focus back to the trigger.
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

	// The reported bug: Tab left the panel open and walked focus onto other page
	// elements. With containment, Tab dismisses the listbox and never strands
	// focus on <body>.
	it('dismisses the listbox on Tab instead of leaving it open', async () => {
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

		expect(document.activeElement).not.toBe(document.body)
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
