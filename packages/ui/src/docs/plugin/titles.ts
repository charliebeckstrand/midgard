import path from 'node:path'
import type { CatalogEntry } from '../../../scripts/intl-catalog.ts'
import { TITLE_ID } from '../kit/example-title.ts'
import { humanize } from '../kit/humanize.ts'
import { exampleFiles, examplesIn, headingIdOf, type Parse, PLAYGROUND } from './examples.ts'
import { findPages } from './pages.ts'

/**
 * The catalog entries of the titles of the examples: one for each file name
 * in `pages`, keyed by its message id, with the English title as the default.
 * The title of an example comes from its file name, so the title has no
 * descriptor in the source for the extraction to read.
 */
export async function titleEntries(
	docs: string,
	parse: Parse,
): Promise<Record<string, CatalogEntry>> {
	const pages = path.join(docs, 'pages')

	const folders = findPages(docs).flatMap((page) => [
		page.folder,
		...page.tabs.map((tab) => `${page.folder}/${tab}`),
	])

	const examples = await Promise.all(
		folders.map((folder) =>
			exampleFiles(path.join(pages, folder)).then((files) => examplesIn(parse, files)),
		),
	)

	// A playground shows a title of its own message, so it has no title entry.
	const ids = [...new Set(examples.flat().map(headingIdOf))]
		.filter((id) => id !== PLAYGROUND)
		.toSorted()

	return Object.fromEntries(
		ids.map((id) => [
			`${TITLE_ID}${id}`,
			{
				defaultMessage: humanize(id),
				description: `The title of an example on a page of the docs. It comes from the file name ${id}.tsx.`,
			},
		]),
	)
}
