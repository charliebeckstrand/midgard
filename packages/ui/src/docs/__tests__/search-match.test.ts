// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { matchEntries } from '../app/search-match.ts'
import type { SearchEntry } from '../plugin/search.ts'

// The order of the results of the search of the docs.

const ENTRIES: readonly SearchEntry[] = [
	{ kind: 'prop', label: 'variant', href: '/button#api-Button-variant', context: '<Button />' },
	{ kind: 'example', label: 'With icon', href: '/button#with-icon', context: 'Button' },
	{ kind: 'component', label: '<Button />', href: '/button#api-Button', context: 'Button' },
	{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
	{ kind: 'page', label: 'CopyButton', href: '/copy-button', context: 'Components' },
	{ kind: 'page', label: 'Grid', href: '/modules/grid', context: 'Modules' },
	{ kind: 'tab', label: 'Sorting', href: '/modules/grid/sorting', context: 'Grid' },
	{ kind: 'example', label: 'Sort by date', href: '/table#sort-by-date', context: 'Table' },
]

/** The hrefs of the matches of `query`, in order. */
function hrefsOf(query: string): string[] {
	return matchEntries(ENTRIES, query).map((entry) => entry.href)
}

describe('matchEntries', () => {
	it('gives each page for an empty query', () => {
		expect(hrefsOf('  ')).toEqual(['/button', '/copy-button', '/modules/grid'])
	})

	it('puts an entry whose label holds the query before one that only its context matches', () => {
		expect(hrefsOf('button')).toEqual([
			'/button',
			'/button#api-Button',
			'/copy-button',
			'/button#with-icon',
			'/button#api-Button-variant',
		])
	})

	it('matches each word in the label or the context', () => {
		expect(hrefsOf('grid sort')).toEqual(['/modules/grid/sorting'])

		expect(hrefsOf('button variant')).toEqual(['/button#api-Button-variant'])
	})

	it('ignores case and the marks of a component name', () => {
		expect(hrefsOf('<BUTTON')).toEqual(hrefsOf('button'))
	})

	it('gives no entry when a word matches nothing', () => {
		expect(hrefsOf('button nothing')).toEqual([])
	})
})
