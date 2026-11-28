import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListDescription, ListItem, ListLabel } from '../../../components/list'
import { TagInput } from '../../../components/tag-input'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { Tree, TreeItem } from '../../../components/tree'
import { ChatList, ChatListItem } from '../../../modules/chat'
import { Dashboard, DashboardTile } from '../../../modules/dashboard'
import { noop, renderUI, screen } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'

/**
 * The first hover of a truncation reveal, before the tooltip state loads. A
 * page loads the state on the first intent, so the hover that measures the
 * clip and turns the tooltip on is also the hover that the state replays. The
 * hover must open the reveal after the load, as it does after the state loads.
 */

// The hold forgets the loaded module, so each case starts before the load.
// The last release leaves the module loaded for the files after this one.
beforeEach(() => tooltipLoad.hold())

afterAll(async () => {
	tooltipLoad.release()

	await tooltipBody.load()
})

const LONG = 'Write the release notes for the spring update of the app'

/** Hovers `node`, releases the load, and gives the tooltip that opens. */
async function hoverBeforeLoad(node: HTMLElement) {
	await userEvent.hover(node)

	tooltipLoad.release()

	return screen.findByRole('tooltip')
}

describe('truncation reveal before the tooltip state loads (real browser)', () => {
	it('opens the reveal of a List row on the first hover', async () => {
		renderUI(
			<div style={{ width: 200 }}>
				<List items={[{ id: 'a' }]} getKey={(item) => item.id} aria-label="Steps">
					{() => (
						<ListItem>
							<ListLabel>{LONG}</ListLabel>
							<ListDescription>Push the tag</ListDescription>
						</ListItem>
					)}
				</List>
			</div>,
		)

		expect(await hoverBeforeLoad(screen.getByText(LONG))).toHaveTextContent(LONG)
	})

	it('opens the reveal of a Tree row on the first hover', async () => {
		renderUI(
			<div style={{ width: 160 }}>
				<Tree aria-label="Docs">
					<TreeItem label={LONG} />
				</Tree>
			</div>,
		)

		expect(await hoverBeforeLoad(screen.getByText(LONG))).toHaveTextContent(LONG)
	})

	it('opens the reveal of a ChatListItem on the first hover', async () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<ChatList aria-label="Conversations">
					<ChatListItem title={LONG} onSelect={noop} />
				</ChatList>
			</div>,
		)

		const select = container.querySelector<HTMLElement>('[data-slot="chat-list-item-select"]')

		if (!select) throw new Error('no select button')

		expect(await hoverBeforeLoad(select)).toHaveTextContent(LONG)
	})

	it('opens the reveal of a TagInput chip on the first hover', async () => {
		renderUI(
			<div style={{ width: 240 }}>
				<TagInput aria-label="Tags" defaultValue={[LONG]} />
			</div>,
		)

		expect(await hoverBeforeLoad(screen.getByText(LONG))).toHaveTextContent(LONG)
	})

	it('opens the reveal of a dashboard tile description on the first hover', async () => {
		const description = 'Click a bar to filter each other tile of the board'

		renderUI(
			<div style={{ width: 960 }}>
				<Dashboard aria-label="Board" layout={{ value: [{ id: 'a', x: 0, y: 0, w: 3, h: 6 }] }}>
					<DashboardTile id="a" title="Units" description={description} minWidth={0}>
						<p>Body</p>
					</DashboardTile>
				</Dashboard>
			</div>,
		)

		expect(await hoverBeforeLoad(screen.getByText(description))).toHaveTextContent(description)
	})
})
