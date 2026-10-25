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
function matchHrefs(query: string): string[] {
	return matchEntries(ENTRIES, query).map((entry) => entry.href)
}

describe('matchEntries', () => {
	it('gives each page for an empty query', () => {
		expect(matchHrefs('  ')).toEqual(['/button', '/copy-button', '/modules/grid'])
	})

	it('puts an entry whose label holds the query before one that only its context matches', () => {
		expect(matchHrefs('button')).toEqual([
			'/button',
			'/button#api-Button',
			'/copy-button',
			'/button#with-icon',
			'/button#api-Button-variant',
		])
	})

	it('matches each word in the label or the context', () => {
		expect(matchHrefs('grid sort')).toEqual(['/modules/grid/sorting'])

		expect(matchHrefs('button variant')).toEqual(['/button#api-Button-variant'])
	})

	it('ignores case and the marks of a component name', () => {
		expect(matchHrefs('<BUTTON')).toEqual(matchHrefs('button'))
	})

	it('finds a label with accents from a query with none', () => {
		const entries = [
			{ kind: 'tab', label: 'Ordenación', href: '/modules/grid/sorting', context: 'Grid' },
		] as const

		expect(matchEntries(entries, 'ordenacion').map((entry) => entry.href)).toEqual([
			'/modules/grid/sorting',
		])
	})

	it('finds a page by its common name, as well as it finds the page by its name', () => {
		const entries = [
			{ kind: 'example', label: 'Botón de silencio', href: '/toggle#mute', context: 'Toggle' },
			{ kind: 'page', label: 'Button', href: '/button', context: 'Components', alias: 'Botón' },
		] as const

		expect(matchEntries(entries, 'boton').map((entry) => entry.href)).toEqual([
			'/button',
			'/toggle#mute',
		])
	})

	it('matches the shown place of an entry, as well as its English context', () => {
		const entries = [
			{
				kind: 'example',
				label: 'Ordenación básica',
				href: '/modules/grid/sorting#basic',
				context: 'Grid › Sorting',
				place: 'Grid › Ordenación',
			},
			{
				kind: 'page',
				label: 'Button',
				href: '/button',
				context: 'Components',
				place: 'Componentes',
			},
		] as const

		const hrefs = (query: string) => matchEntries(entries, query).map((entry) => entry.href)

		expect(hrefs('componentes')).toEqual(['/button'])

		expect(hrefs('grid ordenacion')).toEqual(['/modules/grid/sorting#basic'])

		expect(hrefs('grid sorting')).toEqual(['/modules/grid/sorting#basic'])
	})

	it('gives no entry when a word matches nothing', () => {
		expect(matchHrefs('button nothing')).toEqual([])
	})
})
