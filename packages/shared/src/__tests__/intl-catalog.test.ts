import { readFileSync } from 'node:fs'
import {
	argumentErrors,
	catalogText,
	extractCatalog,
	readCatalog,
	readTranslations,
} from 'ui/scripts/intl-catalog'
import { describe, expect, it } from 'vitest'
import { CATALOG_SOURCE, LANG_DIR, SOURCE_CATALOG } from '../../scripts/intl'
import { catalogs } from '../locale/catalogs'

// The source catalog holds the English default of each message of shared, and
// each translation maps the same ids to the text of its language.
// `AppProviders` gives the translations to `LocaleProvider`, over the catalogs
// of ui. This test holds the files in step, with the checks of ui:
//
//   1. The source catalog equals the output of `pnpm intl` (`scripts/intl.ts`).
//   2. Each id starts with `shared.`, so no message of shared replaces a
//      message of ui or of an app.
//   3. Each translation has each id of the source catalog, and no other id, and
//      the catalogs of shared load it.
//   4. Each translated message parses, and it uses the same arguments as its
//      English default, of the same types.

const source = readCatalog(SOURCE_CATALOG)

const translations = readTranslations(LANG_DIR)

describe('intl catalog of shared', () => {
	it('matches the message descriptors of the source', async () => {
		const text = catalogText(await extractCatalog(CATALOG_SOURCE))

		expect(readFileSync(SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(text)
	})

	it('names each message under `shared.`', () => {
		expect(Object.keys(source).filter((id) => !id.startsWith('shared.'))).toEqual([])
	})

	it('has at least one translation', () => {
		expect(translations.length).toBeGreaterThan(0)
	})

	describe.each(translations)('the $language translation', ({ language, messages }) => {
		it('has each id of the source catalog, and no other id', () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort())
		})

		it('loads in the catalogs of shared', () => {
			expect(catalogs[language]).toEqual(messages)
		})

		it('parses each message, with the arguments of its English default', () => {
			expect(argumentErrors(source, messages)).toEqual([])
		})
	})
})
