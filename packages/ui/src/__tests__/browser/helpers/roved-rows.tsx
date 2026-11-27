import { expect, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { CommandPalette, CommandPaletteItem } from '../../../components/command-palette'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { GlassSurfacesContext } from '../../../primitives/glass/context'
import { noop, renderUI, screen, waitFor } from '../../helpers'

// The roved rows of `active-row-wash.test.tsx` and of its forced half,
// `forced/active-row-wash.test.tsx`.

/**
 * The two rows of an open command palette, the first one roved by the keyboard.
 * The palette is a Dialog, so `glass` stands for the Surfaces setting of the reader.
 */
export const rovedPaletteRow = vi.defineHelper(async (glass: boolean): Promise<HTMLElement> => {
	renderUI(
		<GlassSurfacesContext value={glass}>
			<CommandPalette open onOpenChange={noop}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>
		</GlassSurfacesContext>,
	)

	const row = screen.getByRole('option', { name: 'Alpha' })

	await userEvent.keyboard('{ArrowDown}')

	await waitFor(() => expect(row).toHaveAttribute('data-active'))

	return row
})

/**
 * The row of an open dropdown menu, roved by the pointer. The rows rove by real
 * focus, so the row takes the focus. The pointer stays on the row.
 * `sheet={false}` keeps the panel next to its trigger at the narrow viewport of
 * the suite.
 */
export const rovedMenuRow = vi.defineHelper(async (glass: boolean): Promise<HTMLElement> => {
	renderUI(
		<Menu defaultOpen placement="bottom-start" sheet={false}>
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent aria-label="Actions">
				<MenuItem>Alpha</MenuItem>
				<MenuItem>Beta</MenuItem>
			</MenuContent>
		</Menu>,
		{ glass },
	)

	const row = screen.getByRole('menuitem', { name: 'Alpha' })

	await userEvent.hover(row)

	await waitFor(() => expect(row).toHaveFocus())

	return row
})
