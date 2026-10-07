import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { frames, renderUI, screen } from '../../helpers'

/** A label that is wider than a phone viewport. */
const long = 'A long label '.repeat(12).trim()

/** The width of the phone viewport. */
const width = 414

/**
 * A floating panel with content that is wider than a phone viewport. The panel
 * caps its width to the viewport, less the 8px margin that `shift` keeps at
 * each edge. The size middleware runs only in the real floating engine,
 * because the jsdom suite mocks `@floating-ui/react`.
 */
describe('a floating panel wider than the viewport (real floating engine)', () => {
	beforeAll(() => page.viewport(width, 844))

	async function settle() {
		await frames()

		await frames()
	}

	function expectInside(element: Element) {
		const rect = element.getBoundingClientRect()

		expect(rect.left).toBeGreaterThanOrEqual(8)

		expect(rect.right).toBeLessThanOrEqual(width - 8)
	}

	/** The trigger sits right of the start edge, so a start-aligned panel shifts. */
	function Frame({ children }: { children: ReactNode }) {
		return <div style={{ paddingLeft: 200, paddingTop: 100 }}>{children}</div>
	}

	it('keeps a Menu inside the margin', async () => {
		renderUI(
			<Frame>
				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>{long}</MenuItem>
					</MenuContent>
				</Menu>
			</Frame>,
		)

		await settle()

		expectInside(screen.getByRole('menu'))
	})

	it('keeps a submenu inside the space on its side', async () => {
		renderUI(
			<Menu placement="bottom-start" defaultOpen>
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>

				<MenuContent>
					<MenuSub label="More">
						<MenuItem>{long}</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		await settle()

		await userEvent.click(screen.getByRole('menuitem', { name: /More/ }))

		await settle()

		expectInside(screen.getByRole('menu', { name: /More/ }))
	})

	it('keeps a Popover inside the margin', async () => {
		renderUI(
			<Frame>
				<Popover placement="bottom-start" defaultOpen>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">{long}</PopoverContent>
				</Popover>
			</Frame>,
		)

		await settle()

		expectInside(screen.getByRole('dialog'))
	})

	it('keeps a Listbox inside the margin', async () => {
		renderUI(
			<Frame>
				<Listbox aria-label="Pick">
					<ListboxOption value="a">{long}</ListboxOption>
				</Listbox>
			</Frame>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'Pick' }))

		await settle()

		expectInside(screen.getByRole('listbox'))
	})

	it('keeps a Tooltip inside the margin', async () => {
		renderUI(
			<Frame>
				<Tooltip placement="bottom-start" open>
					<TooltipTrigger>
						<button type="button">Details</button>
					</TooltipTrigger>

					<TooltipContent>{long}</TooltipContent>
				</Tooltip>
			</Frame>,
		)

		// The panel module loads on the first open, so the panel can show a
		// fetch after the render.
		const tooltip = await screen.findByRole('tooltip')

		await settle()

		expectInside(tooltip)
	})
})
