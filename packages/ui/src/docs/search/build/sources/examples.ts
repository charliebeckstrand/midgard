import { humanize } from '../../../kit/humanize.ts'
import { exampleFiles, examplesIn, toCodeKey } from '../../../plugin/examples.ts'
import type { SearchEntry } from '../../types.ts'
import type { SearchSource } from '../source.ts'

/** The entry of each example of the route, with the anchor of its heading. */
export const exampleSource: SearchSource = async ({ folder, href, context }, { parse }) => {
	const examples = await exampleFiles(folder).then((files) => examplesIn(parse, files))

	return examples.map(toCodeKey).map(
		(id): SearchEntry => ({
			kind: 'example',
			label: humanize(id),
			href: `${href}#${id}`,
			context,
		}),
	)
}
