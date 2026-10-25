// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG_SOURCE, LANG_DIR, SOURCE_CATALOG } from '../../../scripts/intl'
import {
	argumentErrors,
	catalogText,
	extractCatalog,
	readCatalog,
	readTranslations,
	TRANSLATIONS_MODULE,
	translationsText,
} from '../../../scripts/intl-catalog'
import { localeIntl } from '../../primitives/intl/intl-catalog'

// The source catalog holds the English default of each message of ui, and each
// translation maps the same ids to the text of its language. The provider loads
// a translation by the language of the locale. A message with no translation
// shows its English default, so a gap does not break a page, but it does leave
// English in a translated page. This test holds the files in step:
//
//   1. The source catalog and the module that imports each translation equal
//      the output of `pnpm intl` (`scripts/intl.ts`).
//   2. Each translation has each id of the source catalog, and no other id, and
//      the catalog of ui loads it.
//   3. Each translated message parses, and it uses the same arguments as its
//      English default, of the same types.

const source = readCatalog(SOURCE_CATALOG)

const translations = readTranslations(LANG_DIR)

describe('intl catalog', () => {
	it('matches the message descriptors of the source', async () => {
		const text = catalogText(await extractCatalog(CATALOG_SOURCE))

		expect(readFileSync(SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(text)
	})

	it('imports each translation', () => {
		expect(
			readFileSync(join(LANG_DIR, TRANSLATIONS_MODULE), 'utf8'),
			'run `pnpm intl` to write the module',
		).toBe(translationsText(LANG_DIR))
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
			expect(argumentErrors(source, messages)).toEqual([])
		})
	})
})

describe('argumentErrors', () => {
	const catalog = {
		'test.count': { defaultMessage: '{count, plural, one {# item} other {# items}}' },
		'test.name': { defaultMessage: 'Hello {name}' },
	}

	it('accepts a message with the arguments of its English default', () => {
		expect(
			argumentErrors(catalog, {
				'test.count': '{count, plural, one {# elemento} other {# elementos}}',
				'test.name': 'Hola {name}',
			}),
		).toEqual([])
	})

	it('reports a message that changes an argument, and a message that does not parse', () => {
		const errors = argumentErrors(catalog, {
			'test.count': '{total, plural, one {# elemento} other {# elementos}}',
			'test.name': 'Hola {name',
		})

		expect(errors).toHaveLength(2)

		expect(errors[0]).toMatch(/^test\.count: /)

		expect(errors[1]).toMatch(/^test\.name: /)
	})
})
