import { describe, expect, it, vi } from 'vitest'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Pagination', () => {
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

describe('Pagination keyboard handling', () => {
	it('forwards onKeyDown before roving navigation', () => {
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

	it('skips roving navigation when the caller calls preventDefault', () => {
		renderUI(
			<Pagination
				onKeyDown={(e) => {
					e.preventDefault()
				}}
			>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
					<PaginationPage>2</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const nav = screen.getByRole('navigation')

		fireEvent.keyDown(nav, { key: 'ArrowRight' })

		expect(nav).toBeInTheDocument()
	})
})
