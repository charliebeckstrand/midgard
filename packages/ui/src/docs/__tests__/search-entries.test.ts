// @vitest-environment node
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import type { BarrelApi } from '../plugin/api.ts'
import { type SearchEntry, searchEntries } from '../plugin/search.ts'

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
	loaded ??= searchEntries(DOCS, (code) => parseAst(code, { lang: 'tsx' }), stubApi)

	return loaded
}

describe('searchEntries', () => {
	it('gives the page, its examples, and its API reference, each with the anchor of its route', async () => {
		const button = (await entries()).filter((entry) => entry.href.startsWith('/button'))

		expect(button).toEqual(
			expect.arrayContaining([
				{ kind: 'page', label: 'Button', href: '/button', context: 'Components' },
				{ kind: 'example', label: 'With icon', href: '/button#with-icon', context: 'Button' },
				{
					kind: 'component',
					label: '<Stubbutton />',
					href: '/button#api-Stubbutton',
					context: 'Button',
				},
				{
					kind: 'prop',
					label: 'size',
					href: '/button#api-Stubbutton-size',
					context: '<Stubbutton />',
				},
				{
					kind: 'event',
					label: 'onSizeChange',
					href: '/button#api-Stubbutton-onSizeChange',
					context: '<Stubbutton />',
				},
			]),
		)
	})

	it('gives each tab, and the examples of a tab at the path of the tab', async () => {
		const all = await entries()

		expect(all).toContainEqual({
			kind: 'tab',
			label: 'Sorting',
			href: '/modules/grid/sorting',
			context: 'Grid',
		})

		const sorting = all.filter(
			(entry) => entry.kind === 'example' && entry.href.startsWith('/modules/grid/sorting#'),
		)

		expect(sorting.length).toBeGreaterThan(0)

		expect(sorting.every((entry) => entry.context === 'Grid › Sorting')).toBe(true)
	})

	it('leaves out a module with no default export, such as shared data', async () => {
		const all = await entries()

		expect(all.some((entry) => entry.href === '/command-palette#commands')).toBe(false)
	})
})
