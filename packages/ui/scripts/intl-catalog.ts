/**
 * The extraction and the checks of a message catalog. Each package that
 * translates its text uses them: ui, `shared`, and the apps. The `intl` script
 * of a package writes its source catalog with {@link extractCatalog} and
 * {@link catalogText}, and its catalog test reads the files with
 * {@link readCatalog} and {@link readTranslations} and checks each translation
 * with {@link argumentErrors}.
 *
 * A source catalog, `en.json`, holds the id, the English default, and the
 * description of each message, for the translators. Each translation,
 * `<language>.json`, maps the same ids to the text of its language.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { extract } from '@formatjs/cli-lib'
import { parse, TYPE } from '@formatjs/icu-messageformat-parser'
import { isStructurallySame } from '@formatjs/icu-messageformat-parser/manipulator.js'

/** The attributes and props that carry text for a person. */
export const TEXT_ATTRIBUTES: ReadonlySet<string> = new Set([
	'alt',
	'aria-braillelabel',
	'aria-brailleroledescription',
	'aria-description',
	'aria-label',
	'aria-placeholder',
	'aria-roledescription',
	'aria-valuetext',
	'description',
	'label',
	'placeholder',
	'title',
])

/** The name of a prop that takes text, such as `emptyLabel`. */
export const TEXT_PROP = /(?:Label|Title|Placeholder|Description|Text)$/

/** Tells if an attribute, a prop, or a property named `name` carries text for a person. */
export function isTextName(name: string): boolean {
	return TEXT_ATTRIBUTES.has(name) || TEXT_PROP.test(name)
}

/** One message of the source catalog: the English default and the note for the translator. */
export type CatalogEntry = { defaultMessage: string; description?: string }

/** The source of a catalog: the source folder of a package and the folders it skips. */
export type CatalogSource = {
	/** The absolute path of the source folder. */
	srcDir: string
	/** The names of the folders that hold no message, such as `__tests__`. */
	skipped: readonly string[]
}

/** One translation: its language subtag and its messages by id. */
export type Translation = { language: string; messages: Record<string, string> }

// The source files under `srcDir`, minus the skipped folders.
async function sourceFiles({ srcDir, skipped }: CatalogSource): Promise<string[]> {
	const entries = await readdir(srcDir, { recursive: true, withFileTypes: true })

	return entries
		.filter(
			(entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts'),
		)
		.map((entry) => join(entry.parentPath, entry.name))
		.filter(
			(path) =>
				!relative(srcDir, path)
					.split('/')
					.some((part) => skipped.includes(part)),
		)
}

/** Reads each message descriptor of the source into the catalog, keyed by id. */
export async function extractCatalog(source: CatalogSource): Promise<Record<string, CatalogEntry>> {
	const json = await extract(await sourceFiles(source), { throws: true })

	return JSON.parse(json) as Record<string, CatalogEntry>
}

/**
 * The text of a catalog file: tab indents and a final newline. `extract`
 * already gives the ids in sorted order.
 */
export function catalogText(catalog: Record<string, unknown>): string {
	return `${JSON.stringify(catalog, null, '\t')}\n`
}

/** Reads the source catalog at `path`. */
export function readCatalog(path: string): Record<string, CatalogEntry> {
	return JSON.parse(readFileSync(path, 'utf8')) as Record<string, CatalogEntry>
}

/** Reads each translation in `langDir`: each JSON file but the source catalog, `en.json`. */
export function readTranslations(langDir: string): Translation[] {
	return readdirSync(langDir)
		.filter((file) => file.endsWith('.json') && file !== 'en.json')
		.map((file) => ({
			language: file.replace(/\.json$/, ''),
			messages: JSON.parse(readFileSync(join(langDir, file), 'utf8')) as Record<string, string>,
		}))
}

/**
 * The problems of a translation, one for each message that does not parse or
 * that does not use the arguments of its English default, of the same types.
 * An id that the source catalog does not have is skipped, because the id check
 * reports it.
 */
export function argumentErrors(
	source: Record<string, CatalogEntry>,
	messages: Record<string, string>,
): string[] {
	const errors: string[] = []

	for (const [id, message] of Object.entries(messages)) {
		const entry = source[id]

		if (!entry) continue

		try {
			const { success, error } = isStructurallySame(parse(entry.defaultMessage), parse(message))

			if (!success) errors.push(`${id}: ${error?.message}`)
		} catch (error) {
			errors.push(`${id}: ${(error as Error).message}`)
		}
	}

	return errors
}

/**
 * `text` as an ICU message with no argument, such as the text of a demo of the
 * docs. A brace or an angle bracket goes in quotes, and each apostrophe then
 * doubles, so {@link parsePlainMessage} gives `text` back.
 */
export function formatPlainMessage(text: string): string {
	if (!/[{}<>]/.test(text)) return text

	return text.replaceAll("'", "''").replace(/[{}<>]+/g, (special) => `'${special}'`)
}

/** The text of an ICU message with no argument. It throws for an argument or a tag. */
export function parsePlainMessage(message: string): string {
	return parse(message)
		.map((element) => {
			if (element.type !== TYPE.literal) {
				throw new Error(`the message "${message}" holds an argument or a tag`)
			}

			return element.value
		})
		.join('')
}
