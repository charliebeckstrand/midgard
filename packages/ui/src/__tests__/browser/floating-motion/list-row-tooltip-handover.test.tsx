import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListDescription, ListItem, ListLabel } from '../../../components/list'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { noop, renderUI, screen } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'

/**
 * The truncation reveal of a reorderable List row, with Motion real. The row
 * of a reorderable list is a Motion `Reorder.Item`, which keeps the ref of its
 * first render. The tooltip of the row mounts before the tooltip state loads,
 * and the state takes over the row with a new ref. The first hover must still
 * open the reveal.
 */

// The hold forgets the loaded module, so each case starts before the load.
// The last release leaves the module loaded for the files after this one.
beforeEach(() => tooltipLoad.hold())

afterAll(async () => {
	tooltipLoad.release()

	await tooltipBody.load()
})

describe('reorderable List row reveal before the tooltip state loads (real browser)', () => {
	const LABEL = 'Write the release notes for the spring update of the app'

	it('opens the reveal of a cut row on the first hover', async () => {
		renderUI(
			<div style={{ width: 220 }}>
				<List items={[{ id: 'a' }]} getKey={(item) => item.id} onReorder={noop} aria-label="Steps">
					{() => (
						<ListItem>
							<ListLabel>{LABEL}</ListLabel>
							<ListDescription>Push the tag</ListDescription>
						</ListItem>
					)}
				</List>
			</div>,
		)

		// The row is a Motion row after the drag code arrives.
		await expect
			.poll(() => document.querySelector('[data-slot="list-item"]')?.getAttribute('tabindex'))
			.toBe('0')

		await userEvent.hover(screen.getByText(LABEL))

		tooltipLoad.release()

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LABEL)
	})
})
