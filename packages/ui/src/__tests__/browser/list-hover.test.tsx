import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem, ListLabel } from '../../components/list'
import { frames, getSlot, renderUI, screen } from '../helpers'

/**
 * The hover treatment of an interactive List row, in a real browser.
 *
 * The row paints its wash on the `<li>`, so the wash covers the padding and the
 * slots. The text step of the content column must follow the same hover, or the
 * row lights up at its edge while its label stays muted. jsdom resolves no
 * `:hover`, so only a real browser can see the two drift apart.
 */

const items = [{ id: 'plan', label: 'Plan' }]

const color = (element: Element) => getComputedStyle(element).color

/** The fill of the rounded wash layer, or of the row itself when it has none. */
const wash = (row: Element) => {
	const before = getComputedStyle(row, '::before').backgroundColor

	return before === 'rgba(0, 0, 0, 0)' ? getComputedStyle(row).backgroundColor : before
}

/** Rests the pointer on the row padding, between the row edge and the content column. */
async function hoverPadding(row: HTMLElement, content: HTMLElement) {
	const inset = content.getBoundingClientRect().left - row.getBoundingClientRect().left

	await userEvent.hover(row, { position: { x: inset / 2, y: row.offsetHeight / 2 } })

	await frames()
}

describe('an interactive List row on hover', () => {
	it('steps its text when the pointer lights its wash, on a row marked interactive', async () => {
		const { container } = renderUI(
			<List variant="plain" sortable={false} items={items} aria-label="Stages">
				{(item) => (
					<ListItem interactive rounded>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const row = getSlot(container, 'list-item')

		const content = getSlot(container, 'list-item-content')

		const rest = { text: color(content), wash: wash(row) }

		await hoverPadding(row, content)

		expect(wash(row)).not.toBe(rest.wash)

		expect(color(content)).not.toBe(rest.text)

		const onPadding = { text: color(content), wash: wash(row) }

		await userEvent.hover(content)

		await frames()

		expect({ text: color(content), wash: wash(row) }).toEqual(onPadding)
	})

	it('steps its text while the pointer rests on a slot, which the wash covers too', async () => {
		const { container } = renderUI(
			<List variant="plain" sortable={false} items={items} aria-label="Stages">
				{(item) => (
					<ListItem onClick={() => {}} suffix={<span data-testid="suffix">Due</span>}>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		const row = getSlot(container, 'list-item')

		const content = getSlot(container, 'list-item-content')

		const rest = color(content)

		await userEvent.hover(content)

		await frames()

		const hovered = color(content)

		expect(hovered).not.toBe(rest)

		await userEvent.hover(screen.getByTestId('suffix'))

		await frames()

		expect(wash(row)).not.toBe('rgba(0, 0, 0, 0)')

		expect(color(content)).toBe(hovered)
	})

	it('shows the pointer on the row padding, where the wash shows', () => {
		const { container } = renderUI(
			<List variant="plain" sortable={false} items={items} aria-label="Stages">
				{(item) => (
					<ListItem
						interactive
						rounded
						suffix={<input type="checkbox" disabled aria-label="Done" />}
					>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		// The padding is the `<li>` itself, so its cursor is the one the pointer shows
		// there. A disabled control in a slot does not refuse the whole row.
		expect(getComputedStyle(getSlot(container, 'list-item')).cursor).toBe('pointer')
	})

	it('refuses the pointer on the whole row while its content is disabled', () => {
		const { container } = renderUI(
			<List variant="plain" sortable={false} items={items} aria-label="Stages">
				{(item) => (
					<ListItem as="button" onClick={() => {}} disabled>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>,
		)

		expect(getComputedStyle(getSlot(container, 'list-item')).cursor).toBe('not-allowed')

		expect(getComputedStyle(getSlot(container, 'list-item-content')).cursor).toBe('not-allowed')
	})
})
