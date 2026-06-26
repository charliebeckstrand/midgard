import { describe, expect, it, vi } from 'vitest'
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

		// Focus settles on the selected option, marked by the presence boolean
		// `data-selected` (`dataAttr` renders it value-less, not `"true"`); poll
		// for it rather than assert synchronously (CONVENTIONS §10.3).
		await waitFor(() => expect(document.activeElement?.hasAttribute('data-selected')).toBe(true))
	})

	// Guards the APG select pattern: Tab dismisses the listbox and the keystroke
	// proceeds, landing focus on the next tabbable after the trigger: not
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

	it('dismisses the listbox on Shift+Tab and moves focus to the previous tabbable', async () => {
		renderUI(
			<>
				<Button>Before</Button>
				<Listbox aria-label="pick">
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus())
	})

	// APG select pattern: Tab accepts the highlighted option, Escape cancels.
	it('commits the highlighted option on Tab', async () => {
		renderUI(
			<>
				<Listbox aria-label="pick" displayValue={(v: string) => v}>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}')

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveTextContent('b'))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus())
	})

	// Tabbing out on the already-selected option must not re-toggle it: with
	// `nullable`, onSelect on the current value clears the selection.
	it('does not clear a nullable selection when tabbing out on the selected option', async () => {
		renderUI(
			<>
				<Listbox aria-label="pick" nullable defaultValue="b" displayValue={(v: string) => v}>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		const panel = await findPanel()

		// Initial focus lands on the selected option.
		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveTextContent('b'))
	})

	it('closes without toggling on Tab in multiple mode', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<>
				<Listbox
					aria-label="pick"
					multiple
					defaultValue={['a']}
					onValueChange={onValueChange}
					displayValue={(v: string) => v}
				>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}')

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		expect(onValueChange).not.toHaveBeenCalled()

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
