import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import type { GridColumnManagerItem } from '../../../modules/grid'
import { GridColumnManager } from '../../../modules/grid/grid-column-manager'
import { GridManagerDialog } from '../../../modules/grid/grid-manager-dialog'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Pin-control `Menu` dismissal inside the grid's manager dialog, against the
 * real floating engine. The dialog and the menu both portal through a bare
 * `FloatingPortal`, and `@floating-ui/react` nests a descendant portal inside
 * its nearest ancestor portal by default — so the open menu's own portal node
 * lands *inside* the dialog's portal node. A press elsewhere in the dialog
 * must still register as outside the menu and close it. The jsdom suite mocks
 * `@floating-ui/react` away (real portal nesting never happens), so only this
 * suite exercises it.
 */
describe('grid column manager dialog pin menu dismiss (real browser)', () => {
	const columns: GridColumnManagerItem[] = [
		{ id: 'name', title: 'Name' },
		{ id: 'email', title: 'Email' },
	]

	it('closes the pin menu on a press elsewhere in the dialog', async () => {
		renderUI(
			<GridManagerDialog open onOpenChange={() => {}} label="Manage columns">
				<GridColumnManager
					columns={columns}
					order={['name', 'email']}
					onOrderChange={() => {}}
					hidden={new Set()}
					onHiddenChange={() => {}}
					onPinChange={() => {}}
				/>
			</GridManagerDialog>,
		)

		await screen.findByRole('dialog')

		await userEvent.click(screen.getByRole('button', { name: 'Pin Name' }))

		await screen.findByRole('menu')

		// Press elsewhere in the dialog — the title — outside the menu's panel.
		await userEvent.click(screen.getByText('Manage columns'))

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})
})
