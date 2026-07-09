import { describe, expect, it } from 'vitest'
import { ContextMenu } from '../../../components/context-menu'
import { Dialog } from '../../../components/dialog'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Context-menu outside-press inside a Dialog (real floating engine). A context
 * menu anchors to the right-clicked element through a virtual *position*
 * reference, so its `domReference` stays null. When that menu opens inside a
 * Dialog — itself a floating-ui portal — an outside press within the dialog
 * lands in a different portal than the menu's own. The ancestor-vs-descendant
 * portal test must recognise the dialog as an ANCESTOR (it contains the menu's
 * anchor) and let the press dismiss the menu; reading only `domReference` (null
 * here) misreads it as a nested descendant and strands the menu open. The jsdom
 * suite mocks `@floating-ui/react` away, so only this project can assert it.
 */
describe('context menu dismiss inside a dialog (real browser)', () => {
	it('closes on an outside press within the enclosing dialog', async () => {
		renderUI(
			<Dialog open aria-label="Report">
				<ContextMenu defaults={[{ key: 'copy', label: 'Copy', onSelect: () => {} }]}>
					<div data-testid="surface" style={{ width: 200, height: 200 }}>
						Right-click me
					</div>
				</ContextMenu>
				<button type="button">Elsewhere</button>
			</Dialog>,
		)

		const surface = screen.getByTestId('surface')

		const rect = surface.getBoundingClientRect()

		fireEvent.contextMenu(surface, { clientX: rect.left + 4, clientY: rect.top + 4 })

		await screen.findByRole('menu')

		// A press elsewhere inside the dialog — outside the menu — is an ordinary
		// outside press and must close the menu.
		const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })

		const elsewhereRect = elsewhere.getBoundingClientRect()

		fireEvent.pointerDown(elsewhere, {
			clientX: elsewhereRect.left + 4,
			clientY: elsewhereRect.top + 4,
		})

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
	})
})
