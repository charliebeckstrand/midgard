import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ESTree } from 'vite'
import type { CatalogEntry } from '../../../scripts/intl-catalog.ts'
import { TITLE_ID } from '../kit/example-title.ts'
import { humanize } from '../kit/humanize.ts'
import { TAB_ID, toSlug } from '../kit/tab-name.ts'
import { exampleFiles, examplesIn, type Parse, PLAYGROUND, toHeadingId } from './examples.ts'
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
	const ids = [...new Set(examples.flat().map(toHeadingId))]
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

/** The names in the `TABS` constant of a module, such as `['Variants', 'Sorting']`. */
function readTabs(program: ESTree.Program): string[] | undefined {
	for (const statement of program.body) {
		const declaration =
			statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement

		if (declaration?.type !== 'VariableDeclaration') continue

		for (const { id, init } of declaration.declarations) {
			if (id.type !== 'Identifier' || id.name !== 'TABS' || init?.type !== 'ArrayExpression') {
				continue
			}

			return init.elements.flatMap((element) =>
				element?.type === 'Literal' && typeof element.value === 'string' ? [element.value] : [],
			)
		}
	}

	return undefined
}

/**
 * The catalog entries of the names of the tabs: one for each tab slug in
 * `pages`, keyed by its message id, with the English name as the default. A
 * page with tabs names them in the `TABS` constant of its `index.tsx`, so a
 * name has no descriptor in the source for the extraction to read.
 */
export async function tabEntries(
	docs: string,
	parse: Parse,
): Promise<Record<string, CatalogEntry>> {
	const pages = path.join(docs, 'pages')

	// The English name of each slug, and the pages that show the tab.
	const tabs = new Map<string, { name: string; pages: string[] }>()

	for (const page of findPages(docs).filter((candidate) => candidate.tabs.length > 0)) {
		const file = path.join(pages, page.folder, 'index.tsx')

		const names = readTabs(parse(await readFile(file, 'utf8'), { lang: 'tsx' }))

		if (!names) throw new Error(`docs: ${page.folder} has tabs, but its index.tsx has no TABS`)

		for (const name of names) {
			const slug = toSlug(name)

			const known = tabs.get(slug)

			if (known && known.name !== name) {
				throw new Error(`docs: the tab ${slug} has two names, ${known.name} and ${name}`)
			}

			tabs.set(slug, { name, pages: [...(known?.pages ?? []), page.name] })
		}
	}

	return Object.fromEntries(
		[...tabs]
			.toSorted(([a], [b]) => (a < b ? -1 : 1))
			.map(([slug, { name, pages: shown }]) => [
				`${TAB_ID}${slug}`,
				{
					defaultMessage: name,
					description: `The name of a tab on the ${shown.join(' and ')} ${shown.length > 1 ? 'pages' : 'page'} of the docs. The tab shows one part of the page.`,
				},
			]),
	)
}
