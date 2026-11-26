import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { toApiId } from '../../../kit/anchors.ts'
import type { SearchEntry } from '../../types.ts'
import type { SearchSource } from '../source.ts'

// The module of a page or a tab imports the API data of a barrel by this id.
const API_IMPORT = /['"]virtual:docs\/api\/([\w/-]+)['"]/g

/**
 * The barrels whose API data the page or the tab in `folder` shows. A module
 * that renders no `<ApiTable` shows no API reference, although it can import
 * the API data for a Playground.
 */
async function readBarrels(folder: string): Promise<string[]> {
	const code = await readFile(path.join(folder, 'index.tsx'), 'utf8')

	if (!code.includes('<ApiTable')) return []

	return [...code.matchAll(API_IMPORT)].flatMap(([, barrel]) => (barrel ? [barrel] : []))
}

/**
 * The entry of each component of the API reference of the route, with the id
 * of its anchor (`kit/anchors.ts`) and the names of its props and events. A
 * prop has no entry of its own, so a common prop, such as `className`, does
 * not fill the results.
 */
export const apiSource: SearchSource = async ({ folder, href, context }, { readApi }) => {
	const apis = await Promise.all((await readBarrels(folder)).map(readApi))

	return apis.flatMap((api) =>
		Object.values(api).map(
			(component): SearchEntry => ({
				kind: 'component',
				label: `<${component.name} />`,
				href: `${href}#${toApiId(component.name)}`,
				context,
				members: [...component.props, ...component.events].map((member) => member.name),
			}),
		),
	)
}
