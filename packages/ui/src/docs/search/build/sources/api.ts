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
 * The entry of each component of the API reference of the route, and of each
 * prop and event of the component, with the id of its anchor
 * (`kit/anchors.ts`).
 */
export const apiSource: SearchSource = async ({ folder, href, context }, { readApi }) => {
	const apis = await Promise.all((await readBarrels(folder)).map(readApi))

	return apis.flatMap((api) =>
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
	)
}
