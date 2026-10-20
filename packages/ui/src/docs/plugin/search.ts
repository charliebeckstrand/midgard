import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { toApiId } from '../kit/anchors.ts'
import { humanize } from '../kit/humanize.ts'
import type { BarrelApi } from './api.ts'
import { exampleFiles, examplesIn, type Parse, toHeadingId } from './examples.ts'
import { findPages } from './pages.ts'

/** What an entry of the search is. */
export type SearchKind = 'page' | 'tab' | 'example' | 'component' | 'prop' | 'event'

/** One entry of the search of the docs. */
export type SearchEntry = {
	kind: SearchKind
	/** The name of the entry, such as `Button`, `With icon`, or `variant`. */
	label: string
	/** The path of the entry, with the hash of its anchor, such as `/button#with-icon`. */
	href: string
	/** Where the entry is: the section of a page, the page of a tab or an example, or the component of a prop. */
	context: string
}

// The module of a page or a tab imports the API data of a barrel by this id.
const API_IMPORT = /['"]virtual:docs\/api\/([\w/-]+)['"]/g

/** The barrels whose API data the page or the tab in `folder` shows. */
async function readBarrels(folder: string): Promise<string[]> {
	const code = await readFile(path.join(folder, 'index.tsx'), 'utf8')

	return [...code.matchAll(API_IMPORT)].flatMap(([, barrel]) => (barrel ? [barrel] : []))
}

/**
 * The entries of the search of the docs at `docs`: each page, each tab, each
 * example, and each component and prop of the API reference of a page or a
 * tab. An entry links to the route that shows it, with the id of its anchor
 * (`kit/anchors.ts`). `readApi` gives the API data of a barrel.
 */
export async function searchEntries(
	docs: string,
	parse: Parse,
	readApi: (barrel: string) => Promise<BarrelApi>,
): Promise<SearchEntry[]> {
	const pages = path.join(docs, 'pages')

	const parts = await Promise.all(
		findPages(docs).map(async (page) => {
			const routes = [
				{ folder: page.folder, href: page.path, context: page.name },
				...page.tabs.map((tab) => ({
					folder: `${page.folder}/${tab}`,
					href: `${page.path}/${tab}`,
					context: `${page.name} › ${humanize(tab)}`,
				})),
			]

			const found = await Promise.all(
				routes.map(async ({ folder, href, context }): Promise<SearchEntry[]> => {
					const absolute = path.join(pages, folder)

					const [examples, barrels] = await Promise.all([
						exampleFiles(absolute).then((files) => examplesIn(parse, files)),
						readBarrels(absolute),
					])

					const apis = await Promise.all(barrels.map(readApi))

					return [
						// The playgrounds of a page share one heading, so one entry.
						...[...new Set(examples.map(toHeadingId))].map(
							(id): SearchEntry => ({
								kind: 'example',
								label: humanize(id),
								href: `${href}#${id}`,
								context,
							}),
						),
						...apis.flatMap((api) =>
							Object.values(api).flatMap((component): SearchEntry[] => [
								{
									kind: 'component',
									label: `<${component.name} />`,
									href: `${href}#${toApiId(component.name)}`,
									context,
								},
								...component.props.map(
									(prop): SearchEntry => ({
										kind: 'prop',
										label: prop.name,
										href: `${href}#${toApiId(component.name, prop.name)}`,
										context: `<${component.name} />`,
									}),
								),
								...component.events.map(
									(event): SearchEntry => ({
										kind: 'event',
										label: event.name,
										href: `${href}#${toApiId(component.name, event.name)}`,
										context: `<${component.name} />`,
									}),
								),
							]),
						),
					]
				}),
			)

			return [
				{ kind: 'page', label: page.name, href: page.path, context: humanize(page.category) },
				...page.tabs.map(
					(tab): SearchEntry => ({
						kind: 'tab',
						label: humanize(tab),
						href: `${page.path}/${tab}`,
						context: page.name,
					}),
				),
				...found.flat(),
			] satisfies SearchEntry[]
		}),
	)

	return parts.flat()
}
