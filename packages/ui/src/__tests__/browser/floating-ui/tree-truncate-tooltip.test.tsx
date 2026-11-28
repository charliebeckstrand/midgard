import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tree, TreeItem } from '../../../components/tree'
import { renderUI, screen } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The truncation reveal of a Tree row (WCAG 1.4.10, 1.4.12, 1.4.4). A narrow
 * tree cuts a long label to one line, so the row shows the full label in a
 * tooltip on a hover of the row and on a keyboard focus of the row. The jsdom
 * suite sees no overflow and mocks `@floating-ui/react`, so the reveal shows
 * only here.
 */
describe('tree row truncation tooltip (real browser)', () => {
	const LONG = 'Upgrade guide for the second major release'

	function Files() {
		return (
			<>
				<button type="button">before</button>

				<div style={{ width: 160 }}>
					<Tree aria-label="Docs">
						<TreeItem label={LONG} />
						<TreeItem label="FAQ" />
					</Tree>
				</div>
			</>
		)
	}

	it('shows the full label in a tooltip on a hover of a cut row', async () => {
		renderUI(<Files />)

		await userEvent.hover(screen.getByText(LONG))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)
	})

	it('shows the full label when the keyboard focuses a cut row', async () => {
		renderUI(<Files />)

		const before = screen.getByRole('button', { name: 'before' })

		// The pointer rests away from the tree, so a hover cannot open the tooltip.
		await userEvent.hover(before)

		// A real Tab, not `focus()`. The tooltip opens on a focus that matches
		// `:focus-visible`, and an earlier test can leave a pointer input.
		before.focus()

		await userEvent.tab()

		const row = screen.getByRole('treeitem', { name: LONG })

		expect(document.activeElement).toBe(row)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		// The label names the row, so the reveal adds no description.
		expect(row).not.toHaveAttribute('aria-describedby')

		// The arrow key moves the focus to a row that fits, and the tooltip closes.
		await userEvent.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: 'FAQ' }))

		await expect.poll(() => screen.queryByRole('tooltip')).toBeNull()
	})

	it('opens no tooltip on a row whose label fits', async () => {
		renderUI(<Files />)

		await userEvent.hover(screen.getByText('FAQ'))

		expect(await tooltipAfterHover()).toBeNull()
	})
})
