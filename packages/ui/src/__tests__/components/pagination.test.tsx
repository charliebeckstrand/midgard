import { describe, expect, it, vi } from 'vitest'
import {
	Pagination,
	PaginationGap,
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

	it('applies custom className', () => {
		const { container } = renderUI(
			<Pagination className="custom">
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		const el = bySlot(container, 'pagination')

		expect(el?.className).toContain('custom')
	})
})

describe('PaginationList', () => {
	it('renders with data-slot="pagination-list"', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		expect(bySlot(container, 'pagination-list')).toBeInTheDocument()
	})
})

describe('PaginationPage', () => {
	it('renders with data-slot="pagination-page"', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage>1</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		expect(bySlot(container, 'pagination-page')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage>42</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByText('42')).toBeInTheDocument()
	})

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

describe('PaginationGap', () => {
	it('renders with data-slot="pagination-gap"', () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationGap />
				</PaginationList>
			</Pagination>,
		)

		expect(bySlot(container, 'pagination-gap')).toBeInTheDocument()
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
