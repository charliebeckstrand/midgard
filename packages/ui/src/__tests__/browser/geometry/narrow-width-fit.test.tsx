import { describe, expect, it } from 'vitest'
import { List, ListItem } from '../../../components/list'
import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../../components/pagination'
import { ScrollArea } from '../../../components/scroll-area'
import { Tab, TabList, Tabs } from '../../../components/tabs'
import { ChatMessage } from '../../../modules/chat'
import { bySlot, getSlot, present, renderUI } from '../../helpers'

/**
 * A component stays inside a narrow parent.
 *
 * At a 390px viewport, Pagination clipped its Next control, a vertical TabList cut a tab label, a
 * ScrollArea extent ran past its parent, and a horizontal List ran past its card. A ChatMessage
 * bubble in a shrink-to-fit parent broke a single word. Each case now fits. Rides the real
 * browser because jsdom loads no stylesheet and does no layout.
 */
describe('narrow-width fit (real browser)', () => {
	const pages = [1, 2, 3, 'gap', 8, 9, 10] as const

	function renderPagination(width: number) {
		return renderUI(
			<div style={{ width }}>
				<Pagination>
					<PaginationPrevious />
					<PaginationList>
						{pages.map((p) =>
							p === 'gap' ? (
								<PaginationGap key={p} />
							) : (
								<PaginationPage key={p} current={p === 2}>
									{p}
								</PaginationPage>
							),
						)}
					</PaginationList>
					<PaginationNext />
				</Pagination>
			</div>,
		)
	}

	const shown = (root: Element) =>
		[...root.querySelectorAll('li')].filter((li) => getComputedStyle(li).display !== 'none')

	it('keeps only the current page of a narrow pagination, and Next inside it', () => {
		const { container } = renderPagination(300)

		const nav = getSlot(container, 'pagination')

		expect(shown(nav)).toHaveLength(1)

		expect(shown(nav)[0]?.querySelector('[aria-current="page"]')).not.toBeNull()

		const next = getSlot(container, 'pagination-next').getBoundingClientRect()

		expect(next.right).toBeLessThanOrEqual(nav.getBoundingClientRect().right)
	})

	it('shows every page of a wide pagination', () => {
		const { container } = renderPagination(600)

		expect(shown(getSlot(container, 'pagination'))).toHaveLength(pages.length)
	})

	it('keeps the full width of a vertical tab list in a narrow group', () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<Tabs defaultValue="Account" orientation="vertical">
					<TabList aria-label="Settings">
						<Tab value="Account">Account</Tab>
						<Tab value="Notifications">Notifications</Tab>
					</TabList>
					<p>Account settings would go here.</p>
				</Tabs>
			</div>,
		)

		const scroll = getSlot(container, 'tab-list-scroll')

		expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth)
	})

	it('caps a horizontal scroll-area extent at its parent', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<ScrollArea orientation="horizontal" extent="md">
					<div style={{ width: 800 }}>content</div>
				</ScrollArea>
			</div>,
		)

		const parent = present(container.firstElementChild, 'parent')

		const area = present(parent.firstElementChild, 'scroll area')

		expect(area.getBoundingClientRect().width).toBeLessThanOrEqual(300)
	})

	it('wraps a horizontal list inside a narrow parent', () => {
		const items = ['Todo', 'In Progress', 'Review', 'Done'].map((label) => ({ id: label, label }))

		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<List items={items} getKey={(i) => i.id} orientation="horizontal">
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</div>,
		)

		const list = present(bySlot(container, 'list'), 'list')

		expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
	})

	it('keeps a short chat bubble on one line in a shrink-to-fit parent', () => {
		const { container } = renderUI(
			<div style={{ display: 'inline-flex' }}>
				<ChatMessage>Assistant</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		const lineHeight = Number.parseFloat(getComputedStyle(bubble).lineHeight)

		const { paddingTop, paddingBottom } = getComputedStyle(bubble)

		const content =
			bubble.getBoundingClientRect().height -
			Number.parseFloat(paddingTop) -
			Number.parseFloat(paddingBottom)

		expect(content).toBeLessThan(lineHeight * 1.5)
	})
})
