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
import { axe } from '../helpers/axe'

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

	it('keeps a consumer aria-current while not current, and current wins', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage aria-current="step">1</PaginationPage>
					<PaginationPage current aria-current="step">
						2
					</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'step')

		expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
	})
})

describe.each([
	['PaginationPrevious', PaginationPrevious, 'Previous page'],
	['PaginationNext', PaginationNext, 'Next page'],
] as const)('%s', (_name, Step, label) => {
	it(`renders a button labeled "${label}"`, () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<Step />
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
	})

	it('does not submit a form by default, and a caller type wins', () => {
		renderUI(
			<Pagination>
				<PaginationList>
					<Step />
					<Step aria-label="Submit" type="submit" />
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getByRole('button', { name: label })).toHaveAttribute('type', 'button')

		expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit')
	})
})

describe('PaginationGap', () => {
	it('hides its list item, so the list counts only the pages', async () => {
		const { container } = renderUI(
			<Pagination>
				<PaginationList>
					<PaginationPage href="?page=1">1</PaginationPage>
					<PaginationGap />
					<PaginationPage href="?page=9">9</PaginationPage>
				</PaginationList>
			</Pagination>,
		)

		expect(screen.getAllByRole('listitem')).toHaveLength(2)

		expect((await axe(container)).violations).toEqual([])
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
