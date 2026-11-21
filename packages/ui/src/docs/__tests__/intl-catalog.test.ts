// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG_LOCALES } from 'ui/providers/locale'
import { describe, expect } from 'vitest'
import {
	argumentErrors,
	catalogText,
	readCatalog,
	readLanguages,
	readTranslations,
	TRANSLATIONS_MODULE,
	translationsText,
} from '../../../scripts/intl/catalog.ts'
import {
	DOCS_LANG_DIR,
	DOCS_SOURCE_CATALOG,
	extractDocsCatalog,
} from '../../../scripts/intl/extract.ts'
import { catalogs } from '../app/catalogs.ts'
import { it } from './extractor.ts'

// The source catalog holds the English default of each message of the docs,
// and each translation maps the same ids to the text of its language. The
// shell gives the translations to `LocaleProvider`, over the catalogs of ui.
// This test holds the files in step, with the checks of ui:
//
//   1. The source catalog and the module that loads each translation equal
//      the output of `pnpm intl` (`scripts/intl/extract.ts`).
//   2. Each id starts with `docs.`, so no message of the docs replaces a
//      message of ui.
//   3. Each translation of the docs is in a language that ui has a catalog
//      for, so the controls of ui show the same language. The reader can
//      choose each of these languages (`app/language.ts`).
//   4. Each translation has each id of the source catalog, and no other id, and
//      the catalogs of the docs load it.
//   5. Each translated message parses, and it uses the same arguments as its
//      English default, of the same types.

const source = readCatalog(DOCS_SOURCE_CATALOG)

const translations = readTranslations(DOCS_LANG_DIR)

describe('intl catalog of the docs', () => {
	// The extraction reads the API data of each playground, so it takes the
	// TypeScript server of the extractor fixture.
	it('matches the message descriptors of the source', { timeout: 60_000 }, async ({
		extractor,
	}) => {
		const text = catalogText(await extractDocsCatalog((barrel) => extractor.extract(barrel)))

		expect(readFileSync(DOCS_SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(
			text,
		)
	})

	it('names each message under `docs.`', () => {
		expect(Object.keys(source).filter((id) => !id.startsWith('docs.'))).toEqual([])
	})

	it('loads each translation', () => {
		expect(
			readFileSync(join(DOCS_LANG_DIR, TRANSLATIONS_MODULE), 'utf8'),
			'run `pnpm intl` to write the module',
		).toBe(translationsText(DOCS_LANG_DIR))
	})

	it('has a translation only in a language of ui', () => {
		expect(
			readLanguages(DOCS_LANG_DIR).filter((language) => !CATALOG_LOCALES.includes(language)),
		).toEqual([])
	})

	describe.each(translations)('the $language translation', ({ language, messages }) => {
		it('has each id of the source catalog, and no other id', () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort())
		})

		it('loads in the catalogs of the docs', async () => {
			const source = catalogs[language]

			expect(typeof source === 'function' ? (await source()).default : source).toEqual(messages)
		})

		it('parses each message, with the arguments of its English default', () => {
			expect(argumentErrors(source, messages)).toEqual([])
		})
	})
})
