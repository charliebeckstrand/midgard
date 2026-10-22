/**
 * Writes the source catalog of ui, `src/primitives/intl/lang/en.json`, and the
 * source catalog of the docs app, `src/docs/lang/en.json`, from the message
 * descriptors in the source.
 *
 * Run `pnpm intl` after you add, change, or remove a message. A catalog holds
 * the id, the English default, and the description of each message, for the
 * translators. Each translation in the folder of a catalog maps the same ids
 * to the text of its language. The test `intl-catalog-boundary.test.ts`
 * compares the catalog of ui with the output of this script, and each
 * translation with the catalog. The test `src/docs/__tests__/intl-catalog.test.ts`
 * does the same for the docs. The extraction and the checks are in
 * `intl-catalog.ts`, which the other packages also use.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'vite'
import type { Parser } from '../src/docs/plugin/examples.ts'
import { tabEntries, titleEntries } from '../src/docs/plugin/titles.ts'
import { type CatalogEntry, type CatalogSource, catalogText, extractCatalog } from './intl-catalog'

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

/** The directory of the catalog and of the translations. */
export const LANG_DIR = join(SRC_DIR, 'primitives', 'intl', 'lang')

/** The source catalog, in English. */
export const SOURCE_CATALOG = join(LANG_DIR, 'en.json')

/**
 * The source of the catalog of ui. The tests, the benchmarks, and the docs app
 * hold no message of ui. The docs app has a catalog of its own, so its
 * messages do not ship with the library.
 */
export const CATALOG_SOURCE: CatalogSource = {
	srcDir: SRC_DIR,
	skipped: ['__tests__', '__benchmarks__', 'docs'],
}

const DOCS_DIR = join(SRC_DIR, 'docs')

/** The directory of the catalog of the docs app and of its translations. */
export const DOCS_LANG_DIR = join(DOCS_DIR, 'lang')

/** The source catalog of the docs app, in English. */
export const DOCS_SOURCE_CATALOG = join(DOCS_LANG_DIR, 'en.json')

/** The source of the catalog of the docs app. The tests hold no message of the docs. */
export const DOCS_CATALOG_SOURCE: CatalogSource = { srcDir: DOCS_DIR, skipped: ['__tests__'] }

/**
 * The catalog of the docs app: the message descriptors of its source, the
 * title of each example, which comes from a file name, and the name of each
 * tab, which comes from the `TABS` of a page. A title and a tab name have no
 * descriptor.
 */
export async function extractDocsCatalog(): Promise<Record<string, CatalogEntry>> {
	const parse: Parser = (code, options) => parseAst(code, options)

	const [messages, titles, tabs] = await Promise.all([
		extractCatalog(DOCS_CATALOG_SOURCE),
		titleEntries(DOCS_DIR, parse),
		tabEntries(DOCS_DIR, parse),
	])

	return Object.fromEntries(
		Object.entries({ ...messages, ...titles, ...tabs }).toSorted(([a], [b]) => (a < b ? -1 : 1)),
	)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const [ui, docs] = await Promise.all([extractCatalog(CATALOG_SOURCE), extractDocsCatalog()])

	await writeFile(SOURCE_CATALOG, catalogText(ui))

	await writeFile(DOCS_SOURCE_CATALOG, catalogText(docs))
}
