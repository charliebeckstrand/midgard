import { Copy, Download } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import {
	Listbox,
	ListboxDescription,
	ListboxLabel,
	ListboxOption,
} from '../../../components/listbox'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuText,
	MenuTrigger,
} from '../../../components/menu'
import { present, renderUI, waitFor } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The icon and the description of a row under forced colors. A roved or focused row paints in the
 * `Highlight` pair, and a row at rest in `CanvasText` on `Canvas`. The icon and the description
 * must take the text color of their row: an icon in `CanvasText` or a description in a muted
 * author color on `Highlight` has too little contrast.
 */

/** The text color of `row`, of its icon, and of its description. */
function inks(row: HTMLElement, descriptionSlot: string) {
	const color = (selector: string) =>
		getComputedStyle(present(row.querySelector<HTMLElement>(selector), selector)).color

	return {
		row: getComputedStyle(row).color,
		icon: color('[data-slot=icon]'),
		description: color(`[data-slot=${descriptionSlot}]`),
	}
}

describe('row ink on Highlight under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('inks the icon and the description of a menu row in the color of the row', async () => {
			renderUI(
				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button>Share</Button>
					</MenuTrigger>
					<MenuContent>
						<MenuItem>
							<Icon icon={<Copy />} />
							<MenuText>
								<MenuLabel>Copy link</MenuLabel>
								<MenuDescription>Anyone can view</MenuDescription>
							</MenuText>
						</MenuItem>
						<MenuItem>
							<Icon icon={<Download />} />
							<MenuText>
								<MenuLabel>Download</MenuLabel>
								<MenuDescription>Save a PDF copy</MenuDescription>
							</MenuText>
						</MenuItem>
					</MenuContent>
				</Menu>,
			)

			await userEvent.click(page.getByRole('button', { name: 'Share' }))

			await userEvent.keyboard('{ArrowDown}')

			const rows = await waitFor(() => {
				const items = [...document.querySelectorAll<HTMLElement>('[role=menuitem]')]

				expect(items[0]).toBe(document.activeElement)

				return items
			})

			const focused = inks(present(rows[0], 'the focused row'), 'menu-description')

			const rest = inks(present(rows[1], 'the row at rest'), 'menu-description')

			expect(focused).toEqual({
				row: systemColor('HighlightText'),
				icon: systemColor('HighlightText'),
				description: systemColor('HighlightText'),
			})

			expect(rest).toEqual({
				row: systemColor('CanvasText'),
				icon: systemColor('CanvasText'),
				description: systemColor('CanvasText'),
			})

			await userEvent.keyboard('{Escape}')
		})

		it('inks the icon and the description of a focused option in the color of the row', () => {
			renderUI(
				<Listbox<string> open displayValue={(value) => value} placeholder="Select status">
					<ListboxOption value="active">
						<Icon icon={<Copy />} />
						<ListboxLabel>Active</ListboxLabel>
						<ListboxDescription>Currently moving freight</ListboxDescription>
					</ListboxOption>
					<ListboxOption value="paused">
						<Icon icon={<Download />} />
						<ListboxLabel>Paused</ListboxLabel>
						<ListboxDescription>Waiting at the depot</ListboxDescription>
					</ListboxOption>
				</Listbox>,
			)

			const options = () => [...document.querySelectorAll<HTMLElement>('[role=option]')]

			const focused = present(options()[0], 'the first option')

			focused.focus()

			expect(document.activeElement).toBe(focused)

			const resting = present(
				options().find((option) => option !== focused),
				'the option at rest',
			)

			expect(inks(focused, 'listbox-description')).toEqual({
				row: systemColor('HighlightText'),
				icon: systemColor('HighlightText'),
				description: systemColor('HighlightText'),
			})

			expect(inks(resting, 'listbox-description')).toEqual({
				row: systemColor('CanvasText'),
				icon: systemColor('CanvasText'),
				description: systemColor('CanvasText'),
			})
		})
	})
})
