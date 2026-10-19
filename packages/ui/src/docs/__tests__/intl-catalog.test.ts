// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOCS_LANG_DIR, DOCS_SOURCE_CATALOG, extractDocsCatalog } from '../../../scripts/intl.ts'
import {
	argumentErrors,
	catalogText,
	readCatalog,
	readTranslations,
} from '../../../scripts/intl-catalog.ts'
import { catalogs } from '../app/catalogs.ts'

// The source catalog holds the English default of each message of the docs,
// and each translation maps the same ids to the text of its language. The
// shell gives the translations to `LocaleProvider`, over the catalogs of ui.
// This test holds the files in step, with the checks of ui:
//
//   1. The source catalog equals the output of `pnpm intl` (`scripts/intl.ts`).
//   2. Each id starts with `docs.`, so no message of the docs replaces a
//      message of ui.
//   3. Each translation has each id of the source catalog, and no other id, and
//      the catalogs of the docs load it.
//   4. Each translated message parses, and it uses the same arguments as its
//      English default, of the same types.

const source = readCatalog(DOCS_SOURCE_CATALOG)

const translations = readTranslations(DOCS_LANG_DIR)

describe('intl catalog of the docs', () => {
	it('matches the message descriptors of the source', async () => {
		const text = catalogText(await extractDocsCatalog())

		expect(readFileSync(DOCS_SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(
			text,
		)
	})

	it('names each message under `docs.`', () => {
		expect(Object.keys(source).filter((id) => !id.startsWith('docs.'))).toEqual([])
	})

	it('has at least one translation', () => {
		expect(translations.length).toBeGreaterThan(0)
	})

	describe.each(translations)('the $language translation', ({ language, messages }) => {
		it('has each id of the source catalog, and no other id', () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort())
		})

		it('loads in the catalogs of the docs', () => {
			expect(catalogs[language]).toEqual(messages)
		})

		it('parses each message, with the arguments of its English default', () => {
			expect(argumentErrors(source, messages)).toEqual([])
		})
	})
})
