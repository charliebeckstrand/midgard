import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListDescription, ListItem, ListLabel } from '../../components/list'
import { expectAnnouncement, getSlot, renderUI } from '../helpers'

/**
 * The lift announcement of a List row, in a real browser.
 *
 * The label and the description of a row are `<span>` elements that only their
 * classes make block boxes. jsdom applies no class styles, so only a real
 * browser can show that the spoken name keeps a space between the two blocks
 * (WCAG 4.1.3). Without it, a screen reader speaks "notesList" as one word.
 */

const items = [
	{ id: 'notes', label: 'Write the release notes', description: 'List the new features' },
	{ id: 'tag', label: 'Tag the release', description: 'Push the tag' },
]

describe('the lift announcement of a List row (real browser)', () => {
	it('puts a space between the label and the description', async () => {
		const { container } = renderUI(
			<List items={items} getKey={(item) => item.id} onReorder={() => {}} aria-label="Steps">
				{(item) => (
					<ListItem>
						<ListLabel>{item.label}</ListLabel>
						<ListDescription>{item.description}</ListDescription>
					</ListItem>
				)}
			</List>,
		)

		const row = getSlot(container, 'list-item')

		row.focus()

		await userEvent.keyboard(' ')

		await expectAnnouncement(
			'Picked up Write the release notes List the new features, position 1 of 2',
			'assertive',
		)
	})
})
