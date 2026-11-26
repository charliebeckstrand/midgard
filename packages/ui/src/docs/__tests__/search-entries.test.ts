// @vitest-environment node
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { BarrelApi } from '../plugin/api.ts'
import { collectEntries } from '../search/build/index.ts'
import { KEYWORDS, keywordsByPath } from '../search/keywords.ts'
import type { SearchEntry } from '../search/types.ts'

// The entries of the search of the docs, as the plugin makes them from the
// pages. The API data is a stub, so the test runs no TypeScript server.

const DOCS = path.resolve(import.meta.dirname, '..')

/** The API data of each barrel: one component, named after the barrel, with one prop and one event. */
async function stubApi(barrel: string): Promise<BarrelApi> {
	const name = `Stub${barrel.split('/').at(-1)?.replaceAll('-', '')}`

	return {
		[name]: {
			name,
			props: [{ name: 'size', type: 'string' }],
			events: [{ name: 'onSizeChange', type: '(size: string) => void' }],
		},
	}
}

let loaded: Promise<SearchEntry[]> | undefined

function entries(): Promise<SearchEntry[]> {
	loaded ??= collectEntries(DOCS, stubApi)

	return loaded
}

describe('collectEntries', () => {
	it('gives the page and its API reference, each with the anchor of its route', async () => {
		const button = (await entries()).filter((entry) => entry.href.startsWith('/button'))

		expect(button).toEqual(
			expect.arrayContaining([
				{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
				{
					kind: 'component',
					label: '<Stubbutton />',
					href: '/button#api-Stubbutton',
					context: 'Button',
					members: ['size', 'onSizeChange'],
				},
			]),
		)
	})

	it('gives each tab, and no entry for an example', async () => {
		const all = await entries()

		expect(all).toContainEqual({
			kind: 'tab',
			label: 'Sorting',
			href: '/modules/grid/sorting',
			context: 'Grid',
		})

		expect(all.some((entry) => (entry.kind as string) === 'example')).toBe(false)
	})

	it('gives a page the words of `keywords.ts` that find it', async () => {
		const dialog = (await entries()).find((entry) => entry.href === '/dialog')

		expect(dialog?.keywords).toEqual(expect.arrayContaining(['modal', 'overlay']))
	})

	it('gives the API reference only at a route that renders its table', async () => {
		const all = await entries()

		const api = (route: string) =>
			all.filter((entry) => entry.href.startsWith(`${route}#api-`)).map((entry) => entry.href)

		// The Gauge tab imports the API data of its page only for its Playground.
		expect(api('/progress')).toContain('/progress#api-Stubprogress')

		expect(api('/progress/gauge')).toEqual([])
	})
})

describe('keywordsByPath', () => {
	it('gives the words of each page', () => {
		const byPath = keywordsByPath(new Set(Object.values(KEYWORDS).flat()))

		expect(byPath.get('/combobox')).toEqual(['autocomplete', 'typeahead', 'creatable', 'dropdown'])
	})

	it('stops on a keyword that names no page', () => {
		expect(() => keywordsByPath(new Set())).toThrow(/names no page/)
	})
})
