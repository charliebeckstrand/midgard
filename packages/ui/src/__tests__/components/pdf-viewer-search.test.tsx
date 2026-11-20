import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	PdfViewer,
	type PdfViewerPage,
	type PdfViewerProps,
	type PdfViewerTextItem,
} from '../../components/pdf-viewer'
import { BREAKPOINT_WIDTHS } from '../../utilities/responsive'
import {
	act,
	allBySlot,
	bySlot,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
} from '../helpers'

beforeEach(() => {
	stubMatchMedia((query) => query === `(min-width: ${BREAKPOINT_WIDTHS.lg})`)
})

/** Pages with a size, so jsdom measures them and the layer renders. */
const pages: PdfViewerPage[] = ['a', 'b', 'c'].map((id, index) => ({
	id,
	src: `page-${index + 1}.png`,
	label: `Page ${index + 1}`,
	width: 850,
	height: 1100,
	pointWidth: 612,
	pointHeight: 792,
}))

const data: PdfViewerTextItem[] = [
	{ page: 1, text: 'Invoice', rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.02 } },
	{ page: 2, text: 'Total', rect: { x: 0.1, y: 0.4, width: 0.1, height: 0.02 } },
	{ page: 2, text: 'due', rect: { x: 0.25, y: 0.4, width: 0.05, height: 0.02 } },
	{ page: 3, text: 'Total', rect: { x: 0.1, y: 0.6, width: 0.1, height: 0.02 } },
]

function renderSearch(props: Partial<PdfViewerProps> = {}) {
	return renderUI(<PdfViewer pages={pages} data={data} {...props} />)
}

async function openSearch() {
	const user = setupUser()

	await user.click(screen.getByRole('button', { name: 'Search' }))

	const field = await screen.findByRole('searchbox', { name: 'Search the document' })

	await waitFor(() => expect(field).toHaveFocus())

	return { user, field }
}

describe('PdfViewer search', () => {
	it('offers the search where data is given', () => {
		renderSearch()

		expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
	})

	it.for([
		{ name: 'without data', props: { data: undefined } },
		{ name: 'with search false', props: { search: false } },
	] satisfies { name: string; props: Partial<PdfViewerProps> }[])(
		'offers no search $name',
		({ props }) => {
			renderSearch(props)

			expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
		},
	)

	it('turns to the page of the first match, and marks it', async () => {
		const onPageChange = vi.fn()

		const { container } = renderSearch({ onPageChange })

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		expect(onPageChange).toHaveBeenLastCalledWith(2)

		expect(screen.getByText('1 of 2')).toBeInTheDocument()

		const layer = bySlot(container, 'pdf-viewer-search-hits')

		expect(layer).toHaveAttribute('aria-hidden', 'true')

		const [hit] = layer?.querySelectorAll('span') ?? []

		expect(hit).toHaveAttribute('data-current')

		expect(hit?.style.left).toBe('10%')

		expect(hit?.style.top).toBe('40%')
	})

	it('steps with Enter and Shift+Enter, and wraps', async () => {
		const onPageChange = vi.fn()

		renderSearch({ onPageChange })

		const { user, field } = await openSearch()

		await user.type(field, 'total{Enter}')

		expect(screen.getByText('2 of 2')).toBeInTheDocument()

		expect(onPageChange).toHaveBeenLastCalledWith(3)

		await user.keyboard('{Enter}')

		expect(screen.getByText('1 of 2')).toBeInTheDocument()

		expect(onPageChange).toHaveBeenLastCalledWith(2)

		await user.keyboard('{Shift>}{Enter}{/Shift}')

		expect(screen.getByText('2 of 2')).toBeInTheDocument()
	})

	it('steps with the buttons of the panel', async () => {
		renderSearch()

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		await user.click(screen.getByRole('button', { name: 'Next match' }))

		expect(screen.getByText('2 of 2')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Previous match' }))

		expect(screen.getByText('1 of 2')).toBeInTheDocument()
	})

	it('says when nothing matches, and disables the steps', async () => {
		renderSearch()

		const { user, field } = await openSearch()

		await user.type(field, 'refund')

		expect(screen.getByText('No matches')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Next match' })).toHaveAttribute(
			'aria-disabled',
			'true',
		)
	})

	it('keeps the page with navigate false', async () => {
		const onPageChange = vi.fn()

		const { container } = renderSearch({ onPageChange, search: { navigate: false } })

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		expect(screen.getByText('1 of 2')).toBeInTheDocument()

		expect(onPageChange).not.toHaveBeenCalled()

		// The page on screen has no match, so it has no layer.
		expect(bySlot(container, 'pdf-viewer-search-hits')).not.toBeInTheDocument()
	})

	it('paints no match with highlight false', async () => {
		const { container } = renderSearch({ search: { highlight: false } })

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		expect(screen.getByText('1 of 2')).toBeInTheDocument()

		expect(bySlot(container, 'pdf-viewer-search-hits')).not.toBeInTheDocument()
	})

	it('marks each thumbnail of a page with a match with a search glyph', async () => {
		const { container } = renderSearch()

		// No query, no marks.
		expect(allBySlot(container, 'pdf-viewer-thumbnail-matches')).toHaveLength(0)

		const { user, field } = await openSearch()

		await user.type(field, 't')

		// "Invoice" has no "t", "Total due" has two, and the last "Total" has two.
		const marks = allBySlot(container, 'pdf-viewer-thumbnail-matches')

		expect(marks).toHaveLength(2)

		// A glyph and no number: the tooltip gives the number.
		expect(marks.every((mark) => mark.querySelector('svg.lucide-search'))).toBe(true)

		expect(marks.every((mark) => mark.textContent === '')).toBe(true)

		const tiles = screen.getAllByRole('button', { name: /^Go to Page/ })

		expect(tiles[0]).not.toHaveAccessibleDescription()

		expect(tiles[1]).toHaveAccessibleDescription('2 matches')

		expect(tiles[2]).toHaveAccessibleDescription('2 matches')

		await user.clear(field)

		expect(allBySlot(container, 'pdf-viewer-thumbnail-matches')).toHaveLength(0)
	})

	it('gives the number of matches in the tooltip of the tile, and none on a tile with no match', async () => {
		renderSearch()

		const { user, field } = await openSearch()

		await user.type(field, 't')

		// Close the panel. The focus goes back to the Search control, and its own tooltip can
		// open, so the checks read the tooltips of the tiles alone.
		await user.click(screen.getByRole('button', { name: 'Search' }))

		const matchTooltips = () =>
			screen.queryAllByRole('tooltip').filter((tooltip) => tooltip.textContent?.includes('match'))

		const tiles = screen.getAllByRole('button', { name: /^Go to Page/ })

		// A tile with no match opens no tooltip of its own.
		act(() => tiles[0]?.focus())

		expect(tiles[0]).toHaveFocus()

		await new Promise((resolve) => setTimeout(resolve, 300))

		expect(matchTooltips()).toHaveLength(0)

		act(() => tiles[1]?.focus())

		await waitFor(() => expect(matchTooltips()).toHaveLength(1))

		expect(matchTooltips()[0]).toHaveTextContent('2 matches')
	})

	it('clears the query on the first Escape, and closes the panel on the next', async () => {
		const { container } = renderSearch()

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		await user.keyboard('{Escape}')

		expect(field).toHaveValue('')

		expect(bySlot(container, 'pdf-viewer-search-hits')).not.toBeInTheDocument()

		await user.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument())
	})

	it('keeps the matches on the page when the panel closes, and holds the trigger down', async () => {
		const { container } = renderSearch()

		const { user, field } = await openSearch()

		await user.type(field, 'total')

		const trigger = screen.getByRole('button', { name: 'Search' })

		await user.click(trigger)

		await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument())

		expect(bySlot(container, 'pdf-viewer-search-hits')).toBeInTheDocument()

		expect(trigger).toHaveAttribute('data-variant', 'soft')
	})
})
