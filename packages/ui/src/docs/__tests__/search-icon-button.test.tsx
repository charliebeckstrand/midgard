import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'
import { setupUser } from '../../__tests__/helpers/setup-user.ts'
import { SearchIconButton } from '../search/ui/search-button.tsx'
import { DocsSearch, SearchPaletteHost } from '../search/ui/search-provider.tsx'

// The icon button of the search in the bar of a narrow screen opens the
// palette with an empty query, as the button in the sidebar does.

// The first import of the palette transforms its module graph, which can take
// longer than the budget of `findBy`. The test is about the press, not the load.
beforeAll(async () => {
	await import('../search/ui/search-palette.tsx')
})

describe('the docs search icon button', () => {
	it('opens the palette with an empty query on a press', async () => {
		const user = setupUser()

		render(
			<MemoryRouter>
				<DocsSearch>
					<SearchIconButton />
					<SearchPaletteHost />
				</DocsSearch>
			</MemoryRouter>,
		)

		await user.click(screen.getByRole('button', { name: 'Search' }))

		expect(await screen.findByRole('combobox')).toHaveProperty('value', '')
	})
})
