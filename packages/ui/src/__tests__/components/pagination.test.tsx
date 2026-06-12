import { describe, expect, it, vi } from 'vitest'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
	PaginationSkeleton,
} from '../../components/pagination'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Pagination', () => {
	it('pairs with an explicit PaginationSkeleton in loading trees', () => {
		const { container } = renderUI(<PaginationSkeleton pages={5} />)

		expect(bySlot(container, 'pagination')).not.toBeInTheDocument()

		expect(allBySlot(container, 'placeholder')).toHaveLength(5)
	})

	it('renders with data-slot="pagination"', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const el = bySlot(container, 'pagination')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})
})

describe('PaginationPage', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage href="/page/1">1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const el = bySlot(container, 'pagination-page')

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/page/1')
	})

	it('marks the current page with aria-current="page"', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage current>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const el = bySlot(container, 'pagination-page')

		expect(el).toHaveAttribute('aria-current', 'page')
	})

	it('omits aria-current when current is false', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const el = bySlot(container, 'pagination-page')

		expect(el).not.toHaveAttribute('aria-current')
	})
})

describe('PaginationPrevious', () => {
	it('renders a button', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPrevious />
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
	})
})

describe('PaginationNext', () => {
	it('renders a button', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<PaginationNext />
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByLabelText('Next page')).toBeInTheDocument()
	})
})

describe('Pagination keyboard model', () => {
	it('forwards onKeyDown to the consumer', () => {
		const onKeyDown = vi.fn()

		renderUI(
			<Pagination onKeyDown={onKeyDown}>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const nav = screen.getByRole('navigation')

		fireEvent.keyDown(nav, { key: 'ArrowRight' })

		expect(onKeyDown).toHaveBeenCalledOnce()
	})

	it('keeps each page link individually Tab-focusable and does not rove on arrows', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage href="/page/1">1</PaginationPage>
					<PaginationPage href="/page/2">2</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const links = screen.getAllByRole('link')

		for (const link of links) expect(link.tabIndex).toBe(0)

		links[0]?.focus()

		fireEvent.keyDown(screen.getByRole('navigation'), { key: 'ArrowRight' })

		expect(document.activeElement).toBe(links[0])
	})
})
