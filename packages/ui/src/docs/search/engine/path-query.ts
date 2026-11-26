/**
 * The query of each part of `path` that can name a page, such as
 * `date picker` and `foo` for `/date-picker/foo`. A part that is the folder of
 * a section, such as `components`, names no page, so it gives no query.
 */
export function toPathQueries(path: string, sections: ReadonlySet<string>): string[] {
	return path
		.toLowerCase()
		.split('/')
		.filter((part) => part !== '' && !sections.has(part))
		.map((part) => part.replaceAll(/[-_.]+/g, ' ').trim())
		.filter(Boolean)
}
