// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	createSearchIndex,
	findMember,
	type Matchable,
	toPathQueries,
} from '../search/engine/index.ts'
import { tokenizeText } from '../search/engine/tokenize.ts'

// The matches of the search of the docs, and their order.

const ENTRIES: readonly Matchable[] = [
	{
		kind: 'component',
		label: '<Button />',
		href: '/button#api-Button',
		context: 'Button',
		members: ['variant', 'onSizeChange'],
	},
	{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
	{ kind: 'page', label: 'CopyButton', href: '/copy-button', context: 'Components' },
	{ kind: 'page', label: 'Dialog', href: '/dialog', context: 'Components', keywords: ['modal'] },
	{
		kind: 'component',
		label: '<DialogPanel />',
		href: '/dialog#api-DialogPanel',
		context: 'Dialog',
		members: ['modal'],
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

	it('puts a page whose keyword is the query before a component with a prop of that name', () => {
		expect(search('modal')).toEqual(['/dialog', '/dialog#api-DialogPanel'])
	})

	it('matches the start of a word and of each part of a camelCase word, not the middle', () => {
		expect(search('change')).toEqual(['/button#api-Button'])

		expect(search('sizeChange')).toEqual(['/button#api-Button'])

		expect(search('copyb')).toEqual(['/copy-button'])

		expect(search('ton')).toEqual([])
	})

	it('corrects one letter of a word of 4 or more letters, only when nothing matches', () => {
		expect(search('buton')[0]).toBe('/button')

		expect(search('grd')).toEqual([])

		expect(search('grid srot')).toEqual([])

		expect(search('grid sortng')).toEqual(['/modules/grid/sorting'])
	})

	it('corrects two letters of a word of 6 or more letters, such as two letters in the wrong order', () => {
		expect(search('dialgo')[0]).toBe('/dialog')

		expect(search('srot')).toEqual([])
	})

	it('puts an entry whose name is the corrected query first', () => {
		const entries: Matchable[] = [
			{
				kind: 'page',
				label: 'IconButton',
				href: '/icon-button',
				context: 'Components',
				keywords: ['toggle button'],
			},
			{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
		]

		expect(search('buton', entries)).toEqual(['/button', '/icon-button'])
	})

	it('puts an entry that each word names before an entry that a prop matches', () => {
		const entries: Matchable[] = [
			{
				kind: 'component',
				label: '<Grid />',
				href: '/modules/grid#api-Grid',
				context: 'Grid',
				members: ['sortable', 'onSortChange'],
			},
			{ kind: 'tab', label: 'Sorting', href: '/modules/grid/sorting', context: 'Grid' },
		]

		expect(search('grid sort', entries)).toEqual([
			'/modules/grid/sorting',
			'/modules/grid#api-Grid',
		])
	})

	it('pairs each corrected word with its own terms, so a prop does not name the entry', () => {
		const entries: Matchable[] = [
			{
				kind: 'component',
				label: '<Grid />',
				href: '/modules/grid#api-Grid',
				context: 'Grid',
				members: ['filter', 'filterable'],
			},
			{ kind: 'tab', label: 'Filters', href: '/modules/grid/filters', context: 'Grid' },
		]

		expect(search('grid filter', entries)).toEqual([
			'/modules/grid/filters',
			'/modules/grid#api-Grid',
		])

		expect(search('grid filtre', entries)).toEqual([
			'/modules/grid/filters',
			'/modules/grid#api-Grid',
		])
	})

	it('does not correct a word that matches, so a near word stays out', () => {
		const entries: Matchable[] = [
			{ kind: 'page', label: 'Table', href: '/table', context: 'Components' },
			{ kind: 'page', label: 'Cable', href: '/cable', context: 'Components' },
		]

		expect(search('table', entries)).toEqual(['/table'])

		expect(search('tablr', entries)).toEqual(['/table'])
	})

	it('matches each word in the label or the context', () => {
		expect(search('grid sort')).toEqual(['/modules/grid/sorting'])

		expect(search('button variant')).toEqual(['/button#api-Button'])

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

describe('findMember', () => {
	it('gives the prop or the event that a word of the query names', () => {
		const button = ENTRIES[0] ?? {}

		expect(findMember(button, 'button variant')).toBe('variant')

		expect(findMember(button, 'onsizechange')).toBe('onSizeChange')

		expect(findMember(button, 'button vari')).toBeUndefined()
	})
})

describe('toPathQueries', () => {
	it('gives the words of each part of the path, with no section folder', () => {
		const sections = new Set(['components', 'modules'])

		expect(toPathQueries('/components/button', sections)).toEqual(['button'])

		expect(toPathQueries('/Date-Picker/foo', sections)).toEqual(['date picker', 'foo'])

		expect(toPathQueries('/modules', sections)).toEqual([])
	})
})
