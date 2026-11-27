import { describe, expect, it } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { List, ListItem } from '../../../components/list'
import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../../components/pagination'
import { Tab, TabList, Tabs } from '../../../components/tabs'
import { ChatMessage } from '../../../modules/chat'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, getSlot, present, renderUI, screen, within } from '../../helpers'

/**
 * A component stays inside a narrow parent.
 *
 * At a 390px viewport, Pagination clipped its Next control, a vertical TabList cut a tab label,
 * and a horizontal List ran past its card. A ChatMessage bubble in a shrink-to-fit parent broke a
 * single word. At a 320px viewport (WCAG 1.4.10), the footer of a paginated Grid ran its row-range
 * status past the edge of the grid, and an Accordion item cut a long header token and its chevron.
 * Each case now fits. Rides the real browser because jsdom loads no stylesheet and does no layout.
 */
describe('narrow-width fit (real browser)', () => {
	const pages = [1, 2, 3, 'gap', 8, 9, 10] as const

	function renderPagination(width: number) {
		return renderUI(
			<div style={{ width }}>
				<Pagination>
					<PaginationPrevious />
					<PaginationList>
						{pages.map((page) =>
							page === 'gap' ? (
								<PaginationGap key={page} />
							) : (
								<PaginationPage key={page} current={page === 2}>
									{page}
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

	it('keeps the current page and the two items on each side of a compact pagination', () => {
		const { container } = renderPagination(340)

		const nav = getSlot(container, 'pagination')

		expect(shown(nav).map((li) => li.textContent)).toEqual(['1', '2', '3', '…'])

		const next = getSlot(container, 'pagination-next').getBoundingClientRect()

		expect(next.right).toBeLessThanOrEqual(nav.getBoundingClientRect().right)
	})

	it('keeps only the current page of a narrow pagination, and Next inside it', () => {
		const { container } = renderPagination(240)

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

	it('keeps a horizontal list on one row that scrolls inside a narrow parent', () => {
		const items = ['Todo', 'In Progress', 'Review', 'Done'].map((label) => ({ id: label, label }))

		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<List items={items} getKey={(item) => item.id} orientation="horizontal">
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</div>,
		)

		const rail = present(bySlot(container, 'list-rail'), 'list rail')

		const rows = [...container.querySelectorAll<HTMLElement>('[data-slot="list-item"]')]

		expect(rail.getBoundingClientRect().width).toBeLessThanOrEqual(300)

		expect(new Set(rows.map((row) => row.getBoundingClientRect().top)).size).toBe(1)
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

	it('keeps the footer of a paginated grid inside the grid at 320px', () => {
		type Row = { id: number; name: string }

		const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

		const rows: Row[] = Array.from({ length: 47 }, (_, index) => ({
			id: index + 1,
			name: `Name ${index + 1}`,
		}))

		// A 320px viewport less two 16px gutters.
		const { container } = renderUI(
			<div style={{ width: 288 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 10 }, pageSizeOptions: [10, 25] }}
				/>
			</div>,
		)

		const footer = getSlot(container, 'grid-pagination')

		const status = within(footer).getByRole('status')

		expect(status).toHaveTextContent('1–10 of 47')

		expect(getSlot(container, 'grid')).toContainBox(status)

		expect(footer).toContainBox(within(footer).getByRole('button', { name: 'Next page' }))

		expect(footer.scrollWidth).toBeLessThanOrEqual(footer.clientWidth)
	})

	it('breaks a long header token of an accordion inside the item', () => {
		// One token with no break opportunity, wider than the box, as a long component name in
		// the props headers of the docs.
		const name = 'CommandPaletteDescriptionHeadingLabelGroupItemSeparatorShortcut'

		const { container } = renderUI(
			<div style={{ width: 240 }}>
				<Accordion>
					<AccordionItem value="description">
						<AccordionTrigger>{name}</AccordionTrigger>
						<AccordionPanel>The description of the palette.</AccordionPanel>
					</AccordionItem>
				</Accordion>
			</div>,
		)

		const item = getSlot(container, 'accordion-item')

		const trigger = screen.getByRole('button', { name })

		const label = present(trigger.querySelector('span'), 'trigger label')

		expect(item).toContainBox(label)

		expect(item).toContainBox(present(trigger.querySelector('svg'), 'trigger indicator'))

		expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
	})
})
