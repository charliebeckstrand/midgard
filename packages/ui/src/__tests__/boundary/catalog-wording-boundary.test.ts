// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, workspaceRoot } from '../helpers/walk-source'

// Catalog wording boundary.
//
// For each idea, the visible text uses one word (CONVENTIONS §13.9). The text
// that a control shows or speaks comes from the English catalogs: the catalog
// of ui, which each app and the docs show, the catalog of shared, which the
// sign-in pages and the shared pages show, and the catalog of the docs. This
// test reads each catalog and fails on a word from the "Not" column of the
// English table. "Pick up" is the verb of a drag, not of a selection, so it
// passes. The docs catalog also holds the names of the pages, of the props,
// and of the examples. Those names come from the names in the code, which the
// table does not cover, so the test skips their ids.

/** The English catalogs, by the name that a failure gives. */
const CATALOGS = {
	ui: join(srcDir, 'primitives', 'intl', 'lang', 'en.json'),
	shared: join(workspaceRoot, 'packages', 'shared', 'src', 'locale', 'lang', 'en.json'),
	docs: join(srcDir, 'docs', 'lang', 'en.json'),
}

/** The ids whose text comes from a name in the code: a page, a prop, or the file of an example. */
const NAME_IDS = /^docs\.(?:page|prop|title)\./

/** Each word of the "Not" column of the English table in §13.9, and the word to use. */
const NOT_WORDS: readonly (readonly [RegExp, string])[] = [
	[/\b(?:choose|chooses|chose|chosen)\b/i, 'Select'],
	[/\bpick(?:s|ed)?\b(?!\s+up\b)/i, 'Select'],
	[/\bdismiss(?:es|ed)?\b/i, 'Close'],
	[/\babort(?:s|ed)?\b/i, 'Cancel'],
	[/\blog(?:ged)?[\s-]?(?:in|out)\b|\blog(?:in|out)\b/i, 'Sign in, Sign out'],
	[/\be-mail\b/i, 'Email'],
	[/\bterms and conditions\b/i, 'Terms of service'],
]

/** The English text of each message of a catalog, by id. */
function readMessages(file: string): Map<string, string> {
	const catalog = JSON.parse(readFileSync(file, 'utf8')) as Record<
		string,
		string | { defaultMessage: string }
	>

	return new Map(
		Object.entries(catalog).map(([id, entry]) => [
			id,
			typeof entry === 'string' ? entry : entry.defaultMessage,
		]),
	)
}

/** Each message of a catalog that uses a word of the "Not" column, as a fix. */
function wordBreaks(name: string, messages: ReadonlyMap<string, string>): string[] {
	return [...messages].flatMap(([id, text]) => {
		if (NAME_IDS.test(id)) return []

		return NOT_WORDS.filter(([word]) => word.test(text)).map(
			([, use]) => `${name} ${id}: "${text}" (use ${use})`,
		)
	})
}

describe('catalog wording boundary', () => {
	const catalogs = Object.entries(CATALOGS).map(
		([name, file]) => [name, readMessages(file)] as const,
	)

	it('reads each catalog', () => {
		// A read that found no message would pass the case below with an empty list.
		for (const [name, messages] of catalogs) {
			expect(messages.size, `${name} catalog`).toBeGreaterThan(50)
		}
	})

	it('uses the word of the table for each idea', () => {
		const violations = catalogs.flatMap(([name, messages]) => wordBreaks(name, messages))

		expect(
			violations,
			`messages with a word from the "Not" column (CONVENTIONS §13.9):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('finds each word of the "Not" column, and passes the verb of a drag', () => {
		const messages = new Map([
			['a', 'Choose a file'],
			['b', 'Pick color from screen'],
			['c', 'Dismiss'],
			['d', 'Login failed.'],
			['e', 'Log out'],
			['f', 'Picked up {item}.'],
			['g', 'To pick up an item, press Space.'],
			['h', 'Select a file'],
		])

		expect(wordBreaks('test', messages).map((fix) => fix.split(':')[0])).toEqual([
			'test a',
			'test b',
			'test c',
			'test d',
			'test e',
		])
	})
})
