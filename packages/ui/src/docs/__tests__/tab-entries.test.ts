// @vitest-environment node
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import { tabEntries } from '../plugin/titles.ts'

// The names of the tabs come from the `TABS` constant of each page with tabs,
// so `pnpm intl` writes one catalog entry for each tab.

const DOCS = path.resolve(import.meta.dirname, '..')

describe('tabEntries', () => {
	it('gives each tab of a page, the first tab too, with its English name', async () => {
		const entries = await tabEntries(DOCS, (code) => parseAst(code, { lang: 'tsx' }))

		// The first tab of the grid is at the path of the page, so it has no folder.
		expect(entries['docs.tab.variants']?.defaultMessage).toBe('Variants')

		expect(entries['docs.tab.sorting']?.defaultMessage).toBe('Sorting')

		// The grid and the form both have a Filters tab, which has one entry.
		expect(entries['docs.tab.filters']?.description).toContain('the Form and Grid pages')
	})
})
