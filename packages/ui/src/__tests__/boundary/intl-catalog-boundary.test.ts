// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type MessageFormatElement, parse, TYPE } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'
import {
	type CatalogEntry,
	catalogText,
	extractCatalog,
	LANG_DIR,
	SOURCE_CATALOG,
} from '../../../scripts/intl'

// The source catalog holds the English default of each message of ui, and each
// translation maps the same ids to the text of its language. The provider loads
// a translation by the language of the locale. A message with no translation
// shows its English default, so a gap does not break a page, but it does leave
// English in a translated page. This test holds the files in step:
//
//   1. The source catalog equals the output of `pnpm intl` (`scripts/intl.ts`).
//   2. Each translation has each id of the source catalog, and no other id.
//   3. Each translated message parses, and it uses the same arguments as its
//      English default.

const source = JSON.parse(readFileSync(SOURCE_CATALOG, 'utf8')) as Record<string, CatalogEntry>

const translations = readdirSync(LANG_DIR)
	.filter((file) => file.endsWith('.json') && file !== 'en.json')
	.map((file) => ({
		language: file.replace(/\.json$/, ''),
		messages: JSON.parse(readFileSync(join(LANG_DIR, file), 'utf8')) as Record<string, string>,
	}))

/** The names of the arguments of a parsed message, at each depth. */
function argumentNames(elements: MessageFormatElement[], names = new Set<string>()): Set<string> {
	for (const element of elements) {
		if (element.type === TYPE.literal || element.type === TYPE.pound) continue

		names.add(element.value)

		if (element.type === TYPE.tag) argumentNames(element.children, names)

		if (element.type === TYPE.select || element.type === TYPE.plural) {
			for (const option of Object.values(element.options)) argumentNames(option.value, names)
		}
	}

	return names
}

describe('intl catalog', () => {
	it('matches the message descriptors of the source', async () => {
		const text = catalogText(await extractCatalog())

		expect(readFileSync(SOURCE_CATALOG, 'utf8'), 'run `pnpm intl` to write the catalog').toBe(text)
	})

	it('has at least one translation', () => {
		expect(translations.length).toBeGreaterThan(0)
	})

	describe.each(translations)('the $language translation', ({ messages }) => {
		it('has each id of the source catalog, and no other id', () => {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort())
		})

		it('parses each message, with the arguments of its English default', () => {
			for (const [id, message] of Object.entries(messages)) {
				const entry = source[id]

				if (!entry) continue

				const expected = [...argumentNames(parse(entry.defaultMessage))].sort()

				expect([...argumentNames(parse(message))].sort(), id).toEqual(expected)
			}
		})
	})
})
