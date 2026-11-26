// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSearchIndex, type Matchable } from '../search/engine/index.ts'
import { tokenizeText } from '../search/engine/tokenize.ts'

// The matches of the search of the docs, and their order.

const ENTRIES: readonly Matchable[] = [
	{ kind: 'prop', label: 'variant', href: '/button#api-Button-variant', context: '<Button />' },
	{
		kind: 'event',
		label: 'onSizeChange',
		href: '/button#api-Button-onSizeChange',
		context: '<Button />',
	},
	{ kind: 'component', label: '<Button />', href: '/button#api-Button', context: 'Button' },
	{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
	{ kind: 'page', label: 'CopyButton', href: '/copy-button', context: 'Components' },
	{ kind: 'page', label: 'Dialog', href: '/dialog', context: 'Components', keywords: ['modal'] },
	{
		kind: 'prop',
		label: 'modal',
		href: '/dialog#api-DialogPanel-modal',
		context: '<DialogPanel />',
	},
	{ kind: 'page', label: 'Grid', href: '/modules/grid', context: 'Modules' },
	{ kind: 'tab', label: 'Sorting', href: '/modules/grid/sorting', context: 'Grid' },
]

/** The hrefs of the matches of `query` in `entries`, in order. */
function search(query: string, entries: readonly Matchable[] = ENTRIES): string[] {
	return createSearchIndex(entries)
		.search(query)
		.map((entry) => entry.href)
}

describe('tokenizeText', () => {
	it('gives each word, and the rest of a camelCase word from each part', () => {
		expect(tokenizeText('<DialogPanel />')).toEqual(['DialogPanel', 'Panel'])

		expect(tokenizeText('onSizeChange')).toEqual(['onSizeChange', 'SizeChange', 'Change'])

		expect(tokenizeText('HTMLInput')).toEqual(['HTMLInput', 'Input'])
	})
})

describe('createSearchIndex', () => {
	it('gives no entry for an empty query', () => {
		expect(search('  ')).toEqual([])
	})

	it('puts an entry whose name is the query first, a page before its API reference', () => {
		expect(search('button').slice(0, 3)).toEqual(['/button', '/button#api-Button', '/copy-button'])
	})

	it('puts a page whose keyword is the query before a prop with that name', () => {
		expect(search('modal')).toEqual(['/dialog', '/dialog#api-DialogPanel-modal'])
	})

	it('matches the start of a word and of each part of a camelCase word, not the middle', () => {
		expect(search('change')).toEqual(['/button#api-Button-onSizeChange'])

		expect(search('sizeChange')).toEqual(['/button#api-Button-onSizeChange'])

		expect(search('copyb')).toEqual(['/copy-button'])

		expect(search('utton')).toEqual([])
	})

	it('matches each word in the label or the context', () => {
		expect(search('grid sort')).toEqual(['/modules/grid/sorting'])

		expect(search('button variant')).toEqual(['/button#api-Button-variant'])

		expect(search('button nothing')).toEqual([])
	})

	it('ignores case and the marks of a component name', () => {
		expect(search('<BUTTON')).toEqual(search('button'))
	})

	it('finds a label with accents from a query with none', () => {
		const entries: Matchable[] = [
			{ kind: 'tab', label: 'Ordenación', href: '/modules/grid/sorting', context: 'Grid' },
		]

		expect(search('ordenacion', entries)).toEqual(['/modules/grid/sorting'])
	})

	it('finds a page by its common name, and an entry by its shown place', () => {
		const entries: Matchable[] = [
			{
				kind: 'page',
				label: 'Button',
				href: '/button',
				context: 'Components',
				alias: 'Botón',
				place: 'Componentes',
			},
			{
				kind: 'tab',
				label: 'Ordenación',
				href: '/modules/grid/sorting',
				context: 'Grid',
				place: 'Grid',
			},
		]

		expect(search('boton', entries)).toEqual(['/button'])

		expect(search('componentes', entries)).toEqual(['/button'])

		expect(search('grid ordenacion', entries)).toEqual(['/modules/grid/sorting'])
	})
})
