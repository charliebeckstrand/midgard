import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListDescription, ListItem, ListLabel } from '../../../components/list'
import { getSlot, noop, renderUI, screen } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The truncation reveal of a List row (WCAG 1.4.10, 1.4.12, 1.4.4). A narrow
 * row cuts its label and its description to one line each, so the row shows
 * the cut text in a tooltip on a hover of the row and on a keyboard focus of
 * the Tab stop of the row. The jsdom suite sees no overflow and mocks
 * `@floating-ui/react`, so the reveal shows only here.
 */
describe('list row truncation tooltip (real browser)', () => {
	const LABEL = 'Write the release notes for the spring update'

	const DESCRIPTION = 'List the new features and each fix that the team made'

	type Item = { id: string; label: string; description?: string }

	const LONG: Item = { id: 'long', label: LABEL, description: DESCRIPTION }

	const SHORT: Item = { id: 'short', label: 'Tag', description: 'Push' }

	/** A list in a narrow box, with a button before it for a real Tab. */
	function Rows({
		items,
		onSelect,
		onReorder,
	}: {
		items: Item[]
		onSelect?: () => void
		onReorder?: (next: Item[]) => void
	}) {
		return (
			<>
				<button type="button">before</button>

				<div style={{ width: 220 }}>
					<List items={items} getKey={(item) => item.id} onReorder={onReorder} aria-label="Steps">
						{(item) => (
							<ListItem onClick={onSelect}>
								<ListLabel>{item.label}</ListLabel>
								{item.description && <ListDescription>{item.description}</ListDescription>}
							</ListItem>
						)}
					</List>
				</div>
			</>
		)
	}

	/** Tabs from the button before the list, and gives the element that takes the focus. */
	const tabIn = vi.defineHelper(async () => {
		const before = screen.getByRole('button', { name: 'before' })

		// The pointer rests on the button before the list, so a hover cannot open the tooltip.
		await userEvent.hover(before)

		// A real Tab, not `focus()`. The tooltip opens on a focus that matches
		// `:focus-visible`, and an earlier test can leave a pointer input.
		before.focus()

		await userEvent.tab()

		return document.activeElement as HTMLElement
	})

	it('shows the cut label and description in a tooltip on a hover of the row', async () => {
		const { container } = renderUI(<Rows items={[LONG]} />)

		await userEvent.hover(getSlot(container, 'list-label'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LABEL)

		expect(tip).toHaveTextContent(DESCRIPTION)
	})

	it('shows the tooltip when the keyboard focuses the content button of the row', async () => {
		const { container } = renderUI(<Rows items={[LONG]} onSelect={noop} />)

		const focused = await tabIn()

		expect(focused).toBe(getSlot(container, 'list-item-content'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LABEL)

		// The row holds the text, so the reveal adds no description.
		expect(focused).not.toHaveAttribute('aria-describedby')
	})

	it('shows the tooltip when the keyboard focuses the row of a reorderable list', async () => {
		const { container } = renderUI(<Rows items={[LONG, SHORT]} onReorder={noop} />)

		const focused = await tabIn()

		expect(focused).toBe(getSlot(container, 'list-item'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LABEL)
	})

	it('shows only the description when only the description is cut', async () => {
		const description = 'Check that each payment of the month met its due date'

		const { container } = renderUI(<Rows items={[{ id: 'pay', label: 'Pay', description }]} />)

		await userEvent.hover(getSlot(container, 'list-label'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(description)

		expect(tip).not.toHaveTextContent('Pay')
	})

	it('opens no tooltip on a row whose text fits', async () => {
		const { container } = renderUI(<Rows items={[SHORT]} />)

		await userEvent.hover(getSlot(container, 'list-label'))

		expect(await tooltipAfterHover()).toBeNull()
	})
})
