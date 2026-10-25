// The search imports the palette, which imports the virtual modules of the docs
// plugin. This program does not hold src/docs, so it takes their types here.
/// <reference path="../../docs/virtual.d.ts" />

import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DocsSearch, SearchButton } from '../../docs/app/search.tsx'
import { FailBoundary } from '../helpers/fail-boundary.tsx'

// The palette of the docs search is in a chunk of its own. When the load that
// a press of the search button asks for fails, the press gives the failure to
// the error boundary, which offers a reload. Without it, the button does
// nothing, and nothing tells the reader.
//
// The mock of the palette module makes its load fail. The `unit` project bars
// a mock of its own in a file (see `test-isolation-boundary.test.ts`), so this
// suite sits in `boundary/`, which the `integration` project runs on forks.

vi.mock('../../docs/app/search-palette.tsx', () => {
	throw new Error('the chunk of the palette did not load')
})

describe('a failed load of the docs search', () => {
	it('gives the failure to the error boundary when the reader presses the button', async () => {
		// React writes the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		render(
			<FailBoundary>
				<DocsSearch>
					<SearchButton />
				</DocsSearch>
			</FailBoundary>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /Search docs/ }))
		})

		expect(await screen.findByText('Failed')).toBeTruthy()
	})
})
