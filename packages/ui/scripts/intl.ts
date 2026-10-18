/**
 * Writes the source catalog of ui, `src/primitives/intl/lang/en.json`, from the
 * message descriptors in the source.
 *
 * Run `pnpm intl` after you add, change, or remove a message. The catalog holds
 * the id, the English default, and the description of each message, for the
 * translators. Each translation in `src/primitives/intl/lang` maps the same ids
 * to the text of its language. The test `intl-catalog-boundary.test.ts` compares
 * the catalog with the output of this script, and each translation with the
 * catalog.
 */

import { readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extract } from '@formatjs/cli-lib'

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

/** The directory of the catalog and of the translations. */
export const LANG_DIR = join(SRC_DIR, 'primitives', 'intl', 'lang')

/** The source catalog, in English. */
export const SOURCE_CATALOG = join(LANG_DIR, 'en.json')

// The folders that hold no message of ui: the tests, the benchmarks, and the
// docs app, which keeps its text in English.
const SKIPPED = new Set(['__tests__', '__benchmarks__', 'docs'])

// The source files of ui, from `SRC_DIR`.
async function sourceFiles(): Promise<string[]> {
	const entries = await readdir(SRC_DIR, { recursive: true, withFileTypes: true })

	return entries
		.filter(
			(entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts'),
		)
		.map((entry) => join(entry.parentPath, entry.name))
		.filter(
			(path) =>
				!relative(SRC_DIR, path)
					.split('/')
					.some((part) => SKIPPED.has(part)),
		)
}

/** One message of the catalog: the English default and the note for the translator. */
export type CatalogEntry = { defaultMessage: string; description?: string }

/** Reads each message descriptor of the source into the catalog, keyed by id. */
export async function extractCatalog(): Promise<Record<string, CatalogEntry>> {
	const json = await extract(await sourceFiles(), { throws: true })

	return JSON.parse(json) as Record<string, CatalogEntry>
}

/**
 * The text of a catalog file: tab indents and a final newline. `extract`
 * already gives the ids in sorted order.
 */
export function catalogText(catalog: Record<string, unknown>): string {
	return `${JSON.stringify(catalog, null, '\t')}\n`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await writeFile(SOURCE_CATALOG, catalogText(await extractCatalog()))
}
