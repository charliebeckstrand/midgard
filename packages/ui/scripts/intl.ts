/**
 * Writes the source catalog of ui, `src/primitives/intl/lang/en.json`, from the
 * message descriptors in the source.
 *
 * Run `pnpm intl` after you add, change, or remove a message. The catalog holds
 * the id, the English default, and the description of each message, for the
 * translators. Each translation in `src/primitives/intl/lang` maps the same ids
 * to the text of its language. The test `intl-catalog-boundary.test.ts` compares
 * the catalog with the output of this script, and each translation with the
 * catalog. The extraction and the checks are in `intl-catalog.ts`, which the
 * other packages also use.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type CatalogSource, catalogText, extractCatalog } from './intl-catalog'

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

/** The directory of the catalog and of the translations. */
export const LANG_DIR = join(SRC_DIR, 'primitives', 'intl', 'lang')

/** The source catalog, in English. */
export const SOURCE_CATALOG = join(LANG_DIR, 'en.json')

/**
 * The source of the catalog of ui. The tests, the benchmarks, and the docs app
 * hold no message of ui. The docs app keeps its text in English.
 */
export const CATALOG_SOURCE: CatalogSource = {
	srcDir: SRC_DIR,
	skipped: ['__tests__', '__benchmarks__', 'docs'],
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await writeFile(SOURCE_CATALOG, catalogText(await extractCatalog(CATALOG_SOURCE)))
}
