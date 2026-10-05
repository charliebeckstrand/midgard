import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxOption } from '../../../components/combobox'
import { Dialog, DialogPanel, DialogTitle } from '../../../components/dialog'
import { Listbox, ListboxOption } from '../../../components/listbox'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { LocaleProvider } from '../../../providers/locale'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * A portal takes a surface out of the DOM subtree of the region that opened it, so a `dir` on the
 * region does not reach it. `LocaleProvider` `dir` opens a direction scope, and `Portal` writes it
 * as `dir` on its host. Thus a surface in a portal lays out in the direction of its region.
 *
 * Rides the real floating engine because the jsdom and default browser suites render a portal
 * inline, inside the region. There the claim passes with no bridge.
 */
const directionOf = (node: HTMLElement) => getComputedStyle(node).direction

describe('direction scopes across portals (real browser)', () => {
	it.each([
		['takes ltr outside a scope', undefined, 'ltr'],
		['follows an rtl provider', 'rtl', 'rtl'],
	] as const)('a dialog title %s', (_name, dir, direction) => {
		renderUI(
			<LocaleProvider dir={dir}>
				<Dialog open onOpenChange={() => {}}>
					<DialogPanel>
						<DialogTitle>Settings</DialogTitle>
					</DialogPanel>
				</Dialog>
			</LocaleProvider>,
		)

		const title = screen.getByText('Settings')

		expect(title.closest('[data-slot="locale"]')).toBeNull()

		expect(directionOf(title)).toBe(direction)
	})

	it('lays out a menu row in the direction of an rtl provider', async () => {
		renderUI(
			<LocaleProvider dir="rtl">
				<Menu placement="bottom-start">
					<MenuTrigger>
						<button type="button">Open</button>
					</MenuTrigger>
					<MenuContent aria-label="Actions">
						<MenuItem>Copy</MenuItem>
					</MenuContent>
				</Menu>
			</LocaleProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const row = await screen.findByRole('menuitem', { name: 'Copy' })

		expect(row.closest('[data-slot="locale"]')).toBeNull()

		expect(directionOf(row)).toBe('rtl')
	})

	// The arrow back out of a submenu reads the direction of the panel, which the portal host sets.
	it.each([
		['ArrowLeft outside a scope', undefined, 'ArrowLeft', 'ArrowRight'],
		['ArrowRight under an rtl provider', 'rtl', 'ArrowRight', 'ArrowLeft'],
	] as const)('closes a submenu with %s', async (_name, dir, back, forward) => {
		renderUI(
			<LocaleProvider dir={dir}>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<button type="button">Open</button>
					</MenuTrigger>
					<MenuContent aria-label="Actions">
						<MenuSub label="More">
							<MenuItem>Nested</MenuItem>
						</MenuSub>
					</MenuContent>
				</Menu>
			</LocaleProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const more = await screen.findByRole('menuitem', { name: /More/ })

		fireEvent.keyDown(more, { key: 'Enter' })

		const nested = await screen.findByRole('menuitem', { name: 'Nested' })

		await waitFor(() => expect(nested).toHaveFocus())

		// The arrow away from the start edge does not close it.
		fireEvent.keyDown(nested, { key: forward })

		expect(nested).toBeInTheDocument()

		fireEvent.keyDown(nested, { key: back })

		await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Nested' })).toBeNull())
	})

	it('lays out a listbox option in the direction of an rtl provider', async () => {
		renderUI(
			<LocaleProvider dir="rtl">
				<Listbox aria-label="Fruit" defaultValue="apple">
					<ListboxOption value="apple">Apple</ListboxOption>
					<ListboxOption value="pear">Pear</ListboxOption>
				</Listbox>
			</LocaleProvider>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }))

		const option = await screen.findByRole('option', { name: 'Pear' })

		expect(directionOf(option)).toBe('rtl')
	})

	it('lays out a combobox option in the direction of an rtl provider', async () => {
		renderUI(
			<LocaleProvider dir="rtl">
				<Combobox<string> aria-label="Fruit">
					<ComboboxOption value="apple">Apple</ComboboxOption>
					<ComboboxOption value="pear">Pear</ComboboxOption>
				</Combobox>
			</LocaleProvider>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }))

		const option = await screen.findByRole('option', { name: 'Pear' })

		expect(directionOf(option)).toBe('rtl')
	})
})
