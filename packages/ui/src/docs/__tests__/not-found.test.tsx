import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFound from '../app/routes/not-found.tsx'
import { DocsSearch, SearchPaletteHost } from '../search/ui/search-provider.tsx'

// The not-found page suggests the pages that the path most likely names, and
// offers the search.

function renderAt(path: string) {
	render(
		<MemoryRouter initialEntries={[path]}>
			<DocsSearch>
				<NotFound />
			</DocsSearch>
		</MemoryRouter>,
	)
}

/** The href of each suggestion, in order. */
function suggestions(): (string | null)[] {
	return screen.queryAllByRole('link').map((link) => link.getAttribute('href'))
}

describe('the not-found page', () => {
	it('offers the search', () => {
		renderAt('/button/foo')

		expect(screen.queryByRole('button', { name: 'Search the docs' })).not.toBeNull()
	})

	it('suggests the page that the last part of the path names', () => {
		renderAt('/components/button')

		expect(suggestions()[0]).toBe('/button')
	})

	it('lists the suggestions under the name of their section, with no section on each row', () => {
		renderAt('/components/button')

		const list = screen.getByRole('list', { name: 'Components' })

		expect(list.textContent).not.toContain('Components')
	})

	it('suggests the page whose path starts the path first', () => {
		renderAt('/modules/grid/nope')

		expect(suggestions()[0]).toBe('/modules/grid')
	})

	it('suggests a page from a path with one wrong letter', () => {
		renderAt('/dialug')

		expect(suggestions()).toContain('/dialog')
	})

	it('corrects a word of the path when another word of the path is correct', () => {
		renderAt('/dialug/input')

		expect(suggestions()).toContain('/dialog')
	})

	it('suggests the pages of a section for the path of the section', () => {
		renderAt('/modules')

		expect(suggestions().length).toBeGreaterThan(0)

		expect(suggestions().every((href) => href?.startsWith('/modules/'))).toBe(true)
	})

	it('shows no suggestion for a path whose words name nothing', () => {
		renderAt('/zzzz')

		expect(suggestions()).toEqual([])
	})

	it('opens the search with the words of the path, and a later open starts empty', async () => {
		const user = userEvent.setup()

		render(
			<MemoryRouter initialEntries={['/components/date-picker']}>
				<DocsSearch>
					<NotFound />
					<SearchPaletteHost />
				</DocsSearch>
			</MemoryRouter>,
		)

		await user.click(screen.getByRole('button', { name: 'Search the docs' }))

		expect(await screen.findByRole('combobox')).toHaveProperty('value', 'date picker')

		await user.keyboard('{Escape}')

		await user.keyboard('{Control>}k{/Control}')

		expect(await screen.findByRole('combobox')).toHaveProperty('value', '')
	})
})
