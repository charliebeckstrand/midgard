// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@formatjs/icu-messageformat-parser'
import { isStructurallySame } from '@formatjs/icu-messageformat-parser/manipulator.js'
import { describe, expect, it } from 'vitest'
import {
	type CatalogEntry,
	catalogText,
	extractCatalog,
	LANG_DIR,
	SOURCE_CATALOG,
} from '../../../scripts/intl'
import { localeIntl } from '../../primitives/intl/intl-catalog'

// The source catalog holds the English default of each message of ui, and each
// translation maps the same ids to the text of its language. The provider loads
// a translation by the language of the locale. A message with no translation
// shows its English default, so a gap does not break a page, but it does leave
// English in a translated page. This test holds the files in step:
//
//   1. The source catalog equals the output of `pnpm intl` (`scripts/intl.ts`).
//   2. Each translation has each id of the source catalog, and no other id, and
//      the catalog of ui loads it.
//   3. Each translated message parses, and it uses the same arguments as its
//      English default, of the same types.

const source = JSON.parse(readFileSync(SOURCE_CATALOG, 'utf8')) as Record<string, CatalogEntry>

const translations = readdirSync(LANG_DIR)
	.filter((file) => file.endsWith('.json') && file !== 'en.json')
	.map((file) => ({
		language: file.replace(/\.json$/, ''),
		messages: JSON.parse(readFileSync(join(LANG_DIR, file), 'utf8')) as Record<string, string>,
	}))

describe('intl catalog', () => {
	it('matches the message descriptors of the source', async () => {
		const text = catalogText(await extractCatalog())

		expect(readFileSync(SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(text)
	})

	it('has at least one translation', () => {
		expect(translations.length).toBeGreaterThan(0)
	})

	describe.each(translations)('the $language translation', ({ language, messages }) => {
		it('has each id of the source catalog, and no other id', () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort())
		})

		it('loads in the catalog of ui', () => {
			expect(localeIntl(language).messages).toEqual(messages)
		})

		it('parses each message, with the arguments of its English default', () => {
			for (const [id, message] of Object.entries(messages)) {
				const entry = source[id]

				if (!entry) continue

				const { success, error } = isStructurallySame(parse(entry.defaultMessage), parse(message))

				expect(success, `${id}: ${error?.message}`).toBe(true)
			}
		})
	})
})
