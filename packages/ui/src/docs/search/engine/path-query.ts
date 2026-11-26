/**
 * The query of the words of `path`, such as `date picker foo` for
 * `/date-picker/foo`. A part that is the folder of a section, such as
 * `components`, names no page, so the query leaves it out.
 */
export function toPathQuery(path: string, sections: ReadonlySet<string>): string {
	return path
		.toLowerCase()
		.split('/')
		.filter((part) => part !== '' && !sections.has(part))
		.map((part) => part.replaceAll(/[-_.]+/g, ' '))
		.join(' ')
		.trim()
}
